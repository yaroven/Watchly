import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Gauge, Histogram } from "prom-client";
import { OmdbConfig, OmdbConfigName } from "../config/omdb.config";

export interface OmdbTitle {
  imdbID?: string;
  imdbVotes?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
}

interface OmdbPayload extends OmdbTitle {
  Response: "True" | "False";
  Error?: string;
}

type Attempt =
  { kind: "ok"; data: OmdbTitle } | { kind: "absent" } | { kind: "retryable"; reason: string };

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

  async fetchByImdbId(imdbId: string): Promise<OmdbTitle | undefined> {
    return this.request({ i: imdbId });
  }

  async fetchByNameYear(name: string, year: number): Promise<OmdbTitle | undefined> {
    return this.request({ t: name, y: String(year) });
  }

  private async request(params: Record<string, string>): Promise<OmdbTitle | undefined> {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const result = await this.attempt(params);

      if (result.kind === "ok") return result.data;
      if (result.kind === "absent") return undefined;

      if (attempt === ATTEMPTS) {
        this.logger.error(
          `OMDb gave up on ${JSON.stringify(params)} after ${ATTEMPTS} attempts: ${result.reason}`,
        );
        return undefined;
      }

      this.logger.warn(
        `OMDb attempt ${attempt} for ${JSON.stringify(params)} failed (${result.reason}), retrying`,
      );
      await delay(RETRY_BACKOFF_MS * attempt);
    }

    return undefined;
  }

  private async attempt(params: Record<string, string>): Promise<Attempt> {
    const stop = duration.startTimer();
    inFlight.inc();

    try {
      const response = await fetch(this.urlFor(params), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (response.status === 429 || response.status >= 500) {
        stop({ outcome: "http_error" });
        return { kind: "retryable", reason: `HTTP ${response.status}` };
      }

      if (!response.ok) {
        stop({ outcome: "http_error" });
        this.logger.warn(`OMDb refused ${JSON.stringify(params)}: ${response.statusText}`);
        return { kind: "absent" };
      }

      const payload = (await response.json()) as OmdbPayload;

      if (payload.Response === "False") {
        stop({ outcome: "not_found" });
        this.logger.warn(`OMDb has no match for ${JSON.stringify(params)}: ${payload.Error}`);
        return { kind: "absent" };
      }

      stop({ outcome: "ok" });
      return { kind: "ok", data: payload };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      stop({ outcome: timedOut ? "timeout" : "network_error" });

      return {
        kind: "retryable",
        reason: timedOut ? `timed out after ${TIMEOUT_MS}ms` : String(error),
      };
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
