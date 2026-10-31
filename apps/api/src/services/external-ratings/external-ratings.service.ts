import { Injectable, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ExternalRatingSource } from "@prisma/client";
import pMap from "p-map";
import { Logged } from "../../decorators/logged.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { toExternalRatingView } from "./external-ratings.mapper";
import { ExternalRatingView, SyncExternalRatingsResult } from "./external-ratings.types";
import { OmdbClient, OmdbTitle } from "./omdb-client.service";

const CONCURRENCY = 5;
const BATCH_SIZE = 200;

const OMDB_SOURCE_MAP: Record<string, ExternalRatingSource> = {
  "Internet Movie Database": ExternalRatingSource.IMDB,
  "Rotten Tomatoes": ExternalRatingSource.ROTTEN_TOMATOES,
  Metacritic: ExternalRatingSource.METACRITIC,
};

interface TitleToSync {
  id: string;
  name: string;
  releaseDate: Date;
  externalIds: { externalId: string }[];
}

const TITLE_SELECTION = {
  id: true,
  name: true,
  releaseDate: true,
  externalIds: {
    where: { source: ExternalRatingSource.IMDB },
    select: { externalId: true },
  },
} as const;

@Injectable()
export class ExternalRatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly omdb: OmdbClient,
  ) {}

  @Cron("0 0 * * *")
  @Logged()
  async syncExternalRatings(): Promise<SyncExternalRatingsResult> {
    let total = 0;
    let synced = 0;

    for await (const batch of this.titleBatches()) {
      total += batch.length;

      await pMap(
        batch,
        async (title) => {
          try {
            if (await this.syncTitleRatings(title)) synced++;
          } catch {
            // @Logged has already logged this failure
          }
        },
        { concurrency: CONCURRENCY },
      );
    }

    return { total, synced };
  }

  @Logged()
  async syncRatingsForTitle(titleId: string): Promise<ExternalRatingView[]> {
    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      select: TITLE_SELECTION,
    });
    if (!title) {
      throw new NotFoundException(`Title with id ${titleId} not found`);
    }

    await this.syncTitleRatings(title);

    const ratings = await this.prisma.externalRatings.findMany({ where: { titleId } });
    return ratings.map(toExternalRatingView);
  }

  private async *titleBatches(): AsyncGenerator<TitleToSync[]> {
    let cursor: string | undefined;

    for (;;) {
      const batch = await this.prisma.title.findMany({
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: TITLE_SELECTION,
      });

      if (batch.length === 0) return;

      yield batch;

      if (batch.length < BATCH_SIZE) return;
      cursor = batch[batch.length - 1].id;
    }
  }

  @Logged()
  private async syncTitleRatings(title: TitleToSync): Promise<boolean> {
    const imdbId = title.externalIds[0]?.externalId;

    const data = imdbId
      ? await this.omdb.fetchByImdbId(imdbId)
      : await this.omdb.fetchByNameYear(title.name, title.releaseDate.getFullYear());

    if (!data) return false;

    if (!imdbId && data.imdbID) {
      await this.rememberImdbId(title.id, data.imdbID);
    }

    return this.writeRatings(title.id, data);
  }

  @Logged()
  private async rememberImdbId(titleId: string, externalId: string): Promise<void> {
    await this.prisma.titleExternalId.upsert({
      where: { titleId_source: { titleId, source: ExternalRatingSource.IMDB } },
      update: { externalId },
      create: { titleId, source: ExternalRatingSource.IMDB, externalId },
    });
  }

  @Logged()
  private async writeRatings(titleId: string, data: OmdbTitle): Promise<boolean> {
    let wrote = false;

    for (const { Source, Value } of data.Ratings ?? []) {
      const source = OMDB_SOURCE_MAP[Source];
      if (!source) continue;

      const rating = parseFloat(Value);
      if (Number.isNaN(rating)) continue;

      const votesCount =
        source === ExternalRatingSource.IMDB ? this.parseVotes(data.imdbVotes) : null;

      await this.prisma.externalRatings.upsert({
        where: { titleId_source: { titleId, source } },
        update: { rating, votesCount },
        create: { titleId, source, rating, votesCount },
      });
      wrote = true;
    }

    return wrote;
  }

  private parseVotes(imdbVotes: string | undefined): number | null {
    const votes = parseInt((imdbVotes ?? "").replace(/,/g, ""), 10);
    return Number.isNaN(votes) ? null : votes;
  }
}
