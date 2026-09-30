import { BadRequestException, Injectable } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TitleEngagementCounts, TitleEngagementDto } from "./dto/response/title-engagement.dto";

const EMPTY_COUNTS: TitleEngagementCounts = { likes: 0, dislikes: 0, watchlistCount: 0 };

@Injectable()
export class TitleEngagementService {
  constructor(private readonly prisma: PrismaService) {}

  async react(titleId: string, userId: string, type: ReactionType): Promise<TitleEngagementDto> {
    await this.assertTitleExists(titleId);

    // Delete-then-upsert rather than read-then-write: two clicks racing each
    // other would both read "no vote" and both insert, and the second would hit
    // the unique index as a 500 rather than a withdrawal.
    const { count: withdrawn } = await this.prisma.titleReaction.deleteMany({
      where: { titleId, userId, type },
    });

    if (withdrawn === 0) {
      await this.prisma.titleReaction.upsert({
        where: { titleId_userId: { titleId, userId } },
        create: { titleId, userId, type },
        update: { type },
      });
    }

    return this.summarize(titleId, userId);
  }

  async removeReaction(titleId: string, userId: string): Promise<TitleEngagementDto> {
    await this.prisma.titleReaction.deleteMany({ where: { titleId, userId } });
    return this.summarize(titleId, userId);
  }

  async addToWatchlist(titleId: string, userId: string): Promise<TitleEngagementDto> {
    await this.assertTitleExists(titleId);

    await this.prisma.watchlistItem.upsert({
      where: { userId_titleId: { userId, titleId } },
      create: { userId, titleId },
      update: {},
    });

    return this.summarize(titleId, userId);
  }

  async removeFromWatchlist(titleId: string, userId: string): Promise<TitleEngagementDto> {
    await this.prisma.watchlistItem.deleteMany({ where: { userId, titleId } });
    return this.summarize(titleId, userId);
  }

  async summarize(titleId: string, viewerId?: string): Promise<TitleEngagementDto> {
    const summaries = await this.summarizeMany([titleId], viewerId);
    return summaries.get(titleId) ?? new TitleEngagementDto({});
  }

  async summarizeMany(
    titleIds: string[],
    viewerId?: string,
  ): Promise<Map<string, TitleEngagementDto>> {
    if (titleIds.length === 0) return new Map();

    const [reactions, watchlisted, mine, myWatchlist] = await Promise.all([
      this.prisma.titleReaction.groupBy({
        by: ["titleId", "type"],
        where: { titleId: { in: titleIds } },
        _count: { _all: true },
      }),
      this.prisma.watchlistItem.groupBy({
        by: ["titleId"],
        where: { titleId: { in: titleIds } },
        _count: { _all: true },
      }),
      viewerId
        ? this.prisma.titleReaction.findMany({
            where: { userId: viewerId, titleId: { in: titleIds } },
            select: { titleId: true, type: true },
          })
        : Promise.resolve<{ titleId: string; type: ReactionType }[]>([]),
      viewerId
        ? this.prisma.watchlistItem.findMany({
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

    return new Map<string, TitleEngagementDto>(
      titleIds.map((titleId) => [
        titleId,
        new TitleEngagementDto({
          ...(counts.get(titleId) ?? EMPTY_COUNTS),
          myReaction: myReactions.get(titleId) ?? null,
          inWatchlist: inWatchlist.has(titleId),
        }),
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

  private async assertTitleExists(titleId: string) {
    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      select: { id: true },
    });
    if (!title) throw new BadRequestException(`Title with id ${titleId} not found`);
  }
}
