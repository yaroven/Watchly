import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Gauge, Histogram } from "prom-client";
import { OmdbConfig, OmdbConfigName } from "../../config/omdb.config";
import { Logged } from "../../decorators/logged.decorator";

export interface OmdbTitle {
  imdbID?: string;
  imdbVotes?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
}

interface OmdbPayload extends OmdbTitle {
  Response: "True" | "False";
  Error?: string;
}

const TIMEOUT_MS = 5000;
const ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 250;

const duration = new Histogram({
  name: "omdb_request_duration_seconds",
  help: "Duration of outbound OMDb requests",
  labelNames: ["outcome"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const inFlight = new Gauge({
  name: "omdb_requests_in_flight",
  help: "OMDb requests started and not yet settled",
});

class OmdbHttpError extends Error {}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class OmdbClient {
  private readonly logger = new Logger(OmdbClient.name);
  private readonly config: OmdbConfig;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<OmdbConfig>(OmdbConfigName);

    if (!this.config.apiKey) {
      this.logger.warn("OMDB_API_KEY is not set — external ratings sync is disabled");
    }
  }

  @Logged({ completedLevel: "debug" })
  async fetchByImdbId(imdbId: string): Promise<OmdbTitle | undefined> {
    try {
      return await this.request({ i: imdbId });
    } catch {
      // @Logged has already logged this failure
      return undefined;
    }
  }

  @Logged({ completedLevel: "debug" })
  async fetchByNameYear(name: string, year: number): Promise<OmdbTitle | undefined> {
    try {
      return await this.request({ t: name, y: String(year) });
    } catch {
      // @Logged has already logged this failure
      return undefined;
    }
  }

  @Logged({ completedLevel: "debug" })
  private async request(params: Record<string, string>): Promise<OmdbTitle | undefined> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.attempt(params);
      } catch (error) {
        if (attempt === ATTEMPTS) {
          throw new Error(`OMDb gave up on ${JSON.stringify(params)} after ${ATTEMPTS} attempts`, {
            cause: error,
          });
        }
        await delay(RETRY_BACKOFF_MS * attempt);
      }
    }
  }

  @Logged({ completedLevel: "debug", failedLevel: "warn" })
  private async attempt(params: Record<string, string>): Promise<OmdbTitle | undefined> {
    const stop = duration.startTimer();
    inFlight.inc();

    try {
      const response = await fetch(this.urlFor(params), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (response.status === 429 || response.status >= 500) {
        stop({ outcome: "http_error" });
        throw new OmdbHttpError(`OMDb answered HTTP ${response.status}`);
      }

      if (!response.ok) {
        stop({ outcome: "http_error" });
        this.logger.warn(`OMDb refused ${JSON.stringify(params)}: ${response.statusText}`);
        return undefined;
      }

      const payload = (await response.json()) as OmdbPayload;

      if (payload.Response === "False") {
        stop({ outcome: "not_found" });
        this.logger.warn(`OMDb has no match for ${JSON.stringify(params)}: ${payload.Error}`);
        return undefined;
      }

      stop({ outcome: "ok" });
      return payload;
    } catch (error) {
      if (error instanceof OmdbHttpError) throw error;

      const timedOut = error instanceof Error && error.name === "TimeoutError";
      stop({ outcome: timedOut ? "timeout" : "network_error" });

      throw timedOut ? new Error(`OMDb timed out after ${TIMEOUT_MS}ms`, { cause: error }) : error;
    } finally {
      inFlight.dec();
    }
  }

  private urlFor(params: Record<string, string>): URL {
    const url = new URL(this.config.baseUrl);

    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set("apikey", this.config.apiKey);

    return url;
  }
}
