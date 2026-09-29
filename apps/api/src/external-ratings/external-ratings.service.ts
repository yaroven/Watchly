import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { ExternalRatingSource } from "@prisma/client";
import pMap from "p-map";
import { OmdbConfig, OmdbConfigName } from "../config/omdb.config";
import { PrismaService } from "../prisma/prisma.service";
import { ExternalRatingResponseDto } from "../title/dto/response/external-rating-response.dto";
import { SyncExternalRatingsResponseDto } from "./dto/response/sync-external-ratings-response.dto";

const CONCURRENCY = 5;

const OMDB_SOURCE_MAP: Record<string, ExternalRatingSource> = {
  "Internet Movie Database": ExternalRatingSource.IMDB,
  "Rotten Tomatoes": ExternalRatingSource.ROTTEN_TOMATOES,
  Metacritic: ExternalRatingSource.METACRITIC,
};

interface OmdbTitleResponse {
  Response: "True" | "False";
  Error?: string;
  imdbID?: string;
  imdbVotes?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
}

@Injectable()
export class ExternalRatingsService {
  private readonly logger = new Logger(ExternalRatingsService.name);
  private readonly omdbConfig: OmdbConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.omdbConfig = this.configService.getOrThrow<OmdbConfig>(OmdbConfigName);
    const isKeyExist = Boolean(this.omdbConfig.apiKey);
    if (!isKeyExist) {
      this.logger.warn("OMDB_API_KEY is not set — external ratings sync is disabled");
    }
  }

  /**
   * Pulls IMDB, Rotten Tomatoes and Metacritic ratings from OMDb for every title. Runs nightly
   * via cron; also triggerable on demand through `POST /external-ratings/sync`.
   */
  @Cron("0 0 * * *")
  async syncExternalRatings(): Promise<SyncExternalRatingsResponseDto> {
    const titles = await this.prisma.title.findMany({
      include: { externalIds: { where: { source: ExternalRatingSource.IMDB } } },
    });

    this.logger.log(`[1/2] Fetching OMDb ratings for ${titles.length} titles`);

    let syncedCount = 0;

    await pMap(
      titles,
      async (title) => {
        try {
          if (await this.syncTitleRatings(title)) syncedCount++;
        } catch (error) {
          // One title's OMDb match colliding with another (e.g. duplicate
          // names in our catalog resolving to the same imdbId) must not
          // abort the whole sync — skip it and keep going.
          this.logger.error(`Failed to sync ratings for title ${title.id} (${title.name}):`, error);
        }
      },
      { concurrency: CONCURRENCY },
    );

    this.logger.log(`[2/2] Synced ratings for ${syncedCount}/${titles.length} titles`);
    return new SyncExternalRatingsResponseDto({ total: titles.length, synced: syncedCount });
  }

  /** Pulls OMDb ratings for one title on demand and returns its current rating rows. */
  async syncRatingsForTitle(titleId: string): Promise<ExternalRatingResponseDto[]> {
    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      include: { externalIds: { where: { source: ExternalRatingSource.IMDB } } },
    });
    if (!title) {
      throw new NotFoundException(`Title with id ${titleId} not found`);
    }

    await this.syncTitleRatings(title);

    const ratings = await this.prisma.externalRatings.findMany({ where: { titleId } });
    return ratings.map((rating) => new ExternalRatingResponseDto(rating));
  }

  private async syncTitleRatings(title: {
    id: string;
    name: string;
    releaseDate: Date;
    externalIds: { externalId: string }[];
  }): Promise<boolean> {
    const imdbId = title.externalIds[0]?.externalId;
    const data = await this.fetchOmdb(
      imdbId
        ? { i: imdbId }
        : {
            t: title.name,
            y: String(new Date(title.releaseDate).getFullYear()),
          },
    );
    if (!data) return false;

    // Title lookup succeeded without a stored imdbId (first sync for this
    // title) — cache it so future runs query OMDb directly by id instead of
    // searching by name/year again.
    if (!imdbId && data.imdbID) {
      await this.prisma.titleExternalId.upsert({
        where: { titleId_source: { titleId: title.id, source: ExternalRatingSource.IMDB } },
        update: { externalId: data.imdbID },
        create: { titleId: title.id, source: ExternalRatingSource.IMDB, externalId: data.imdbID },
      });
    }

    let syncedAny = false;

    for (const { Source, Value } of data.Ratings ?? []) {
      const source = OMDB_SOURCE_MAP[Source];
      if (!source) continue;

      const rating = parseFloat(Value);
      if (Number.isNaN(rating)) continue;

      const votesCount =
        source === ExternalRatingSource.IMDB ? this.parseVotes(data.imdbVotes) : null;

      await this.prisma.externalRatings.upsert({
        where: { titleId_source: { titleId: title.id, source } },
        update: { rating, votesCount },
        create: { titleId: title.id, source, rating, votesCount },
      });
      syncedAny = true;
    }

    return syncedAny;
  }

  private parseVotes(imdbVotes: string | undefined): number | null {
    const votes = parseInt((imdbVotes ?? "").replace(/,/g, ""), 10);
    return Number.isNaN(votes) ? null : votes;
  }

  private async fetchOmdb(params: Record<string, string>): Promise<OmdbTitleResponse | undefined> {
    try {
      const url = new URL(this.omdbConfig.baseUrl);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      url.searchParams.set("apikey", this.omdbConfig.apiKey);

      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(
          `OMDb request failed for ${JSON.stringify(params)}: ${response.statusText}`,
        );
        return undefined;
      }

      const data = (await response.json()) as OmdbTitleResponse;
      if (data.Response === "False") {
        this.logger.warn(`OMDb error for ${JSON.stringify(params)}: ${data.Error}`);
        return undefined;
      }

      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch OMDb data for ${JSON.stringify(params)}:`, error);
      return undefined;
    }
  }
}
