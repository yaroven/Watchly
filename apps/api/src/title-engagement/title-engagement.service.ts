import { Injectable, NotFoundException } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  TitleEngagementCounts,
  TitleEngagementDto,
  ViewerTitleEngagementDto,
} from "./dto/response/title-engagement.dto";

const EMPTY_COUNTS: TitleEngagementCounts = { likes: 0, dislikes: 0, watchlistCount: 0 };

/** The slice of the client that both the service and a transaction expose. */
type PrismaClientLike = Pick<PrismaService, "title" | "titleReaction" | "watchlistItem">;

@Injectable()
export class TitleEngagementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sending the vote already cast withdraws it; the other one switches sides.
   *
   * The delete's row count answers "had they already cast this exact vote?" with no
   * separate read. The write and the summary read back from it share one transaction,
   * so a failure cannot leave the previous vote deleted with nothing in its place, and
   * the response can never describe a state that was not committed. Concurrent requests
   * for the same vote resolve last-writer-wins.
   */
  async react(titleId: string, userId: string, type: ReactionType): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertTitleExists(titleId, tx);

      const { count: withdrawn } = await tx.titleReaction.deleteMany({
        where: { titleId, userId, type },
      });

      if (withdrawn === 0) {
        await tx.titleReaction.upsert({
          where: { titleId_userId: { titleId, userId } },
          create: { titleId, userId, type },
          update: { type },
        });
      }

      return this.summarizeWith(tx, titleId, userId);
    });
  }

  async removeReaction(titleId: string, userId: string): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertTitleExists(titleId, tx);
      await tx.titleReaction.deleteMany({ where: { titleId, userId } });
      return this.summarizeWith(tx, titleId, userId);
    });
  }

  async addToWatchlist(titleId: string, userId: string): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertTitleExists(titleId, tx);

      await tx.watchlistItem.upsert({
        where: { userId_titleId: { userId, titleId } },
        create: { userId, titleId },
        update: {},
      });

      return this.summarizeWith(tx, titleId, userId);
    });
  }

  async removeFromWatchlist(titleId: string, userId: string): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertTitleExists(titleId, tx);
      await tx.watchlistItem.deleteMany({ where: { userId, titleId } });
      return this.summarizeWith(tx, titleId, userId);
    });
  }

  /** `viewerId` is explicit even when there is none, so no caller omits it by accident. */
  async summarize(titleId: string, viewerId: string | null): Promise<TitleEngagementDto> {
    // Zeroes for an id that does not exist would be a plausible-looking answer to
    // a question about nothing, and the write paths already 404 on it.
    await this.assertTitleExists(titleId, this.prisma);
    return this.summarizeWith(this.prisma, titleId, viewerId);
  }

  async summarizeMany(
    titleIds: string[],
    viewerId: string | null,
  ): Promise<Map<string, TitleEngagementDto>> {
    return this.summarizeManyWith(this.prisma, titleIds, viewerId);
  }

  private async summarizeWith(
    client: PrismaClientLike,
    titleId: string,
    viewerId: string | null,
  ): Promise<TitleEngagementDto> {
    const summaries = await this.summarizeManyWith(client, [titleId], viewerId);
    // summarizeManyWith builds one entry per requested id, so this cannot miss.
    return summaries.get(titleId)!;
  }

  private async summarizeManyWith(
    client: PrismaClientLike,
    titleIds: string[],
    viewerId: string | null,
  ): Promise<Map<string, TitleEngagementDto>> {
    if (titleIds.length === 0) return new Map();

    const [reactions, watchlisted, mine, myWatchlist] = await Promise.all([
      client.titleReaction.groupBy({
        by: ["titleId", "type"],
        where: { titleId: { in: titleIds } },
        _count: { _all: true },
      }),
      client.watchlistItem.groupBy({
        by: ["titleId"],
        where: { titleId: { in: titleIds } },
        _count: { _all: true },
      }),
      viewerId
        ? client.titleReaction.findMany({
            where: { userId: viewerId, titleId: { in: titleIds } },
            select: { titleId: true, type: true },
          })
        : Promise.resolve<{ titleId: string; type: ReactionType }[]>([]),
      viewerId
        ? client.watchlistItem.findMany({
            where: { userId: viewerId, titleId: { in: titleIds } },
            select: { titleId: true },
          })
        : Promise.resolve<{ titleId: string }[]>([]),
    ]);

    const counts = new Map<string, TitleEngagementCounts>();
    const countsFor = (titleId: string) => {
      const current = counts.get(titleId) ?? { ...EMPTY_COUNTS };
      counts.set(titleId, current);
      return current;
    };

    for (const row of reactions) {
      const current = countsFor(row.titleId);
      if (row.type === ReactionType.LIKE) current.likes = row._count._all;
      else current.dislikes = row._count._all;
    }
    for (const row of watchlisted) {
      countsFor(row.titleId).watchlistCount = row._count._all;
    }

    const myReactions = new Map<string, ReactionType>(
      mine.map((row) => [row.titleId, row.type] as const),
    );
    const inWatchlist = new Set<string>(myWatchlist.map((row) => row.titleId));

    // One entry per requested id, so no caller can mistake "no entry" for "no engagement".
    return new Map<string, TitleEngagementDto>(
      titleIds.map((titleId) => [
        titleId,
        new TitleEngagementDto(
          counts.get(titleId) ?? EMPTY_COUNTS,
          viewerId
            ? new ViewerTitleEngagementDto(
                myReactions.get(titleId) ?? null,
                inWatchlist.has(titleId),
              )
            : null,
        ),
      ]),
    );
  }

  async findWatchlistTitleIds(
    userId: string,
    { page = 1, limit = 10 }: { page?: number; limit?: number },
  ): Promise<{ titleIds: string[]; totalCount: number }> {
    const [items, totalCount] = await Promise.all([
      this.prisma.watchlistItem.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: { titleId: true },
      }),
      this.prisma.watchlistItem.count({ where: { userId } }),
    ]);

    return { titleIds: items.map((item) => item.titleId), totalCount };
  }

  private async assertTitleExists(titleId: string, client: PrismaClientLike) {
    const title = await client.title.findUnique({ where: { id: titleId }, select: { id: true } });
    // 404, matching GET /title/:id — the request is well-formed, the resource is gone.
    if (!title) throw new NotFoundException(`Title with id ${titleId} not found`);
  }
}
