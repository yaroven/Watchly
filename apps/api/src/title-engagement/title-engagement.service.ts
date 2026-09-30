import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TitleEngagementCounts, TitleEngagementDto } from "./dto/response/title-engagement.dto";

const EMPTY_COUNTS: TitleEngagementCounts = { likes: 0, dislikes: 0, watchlistCount: 0 };

/// Prisma reads `undefined` in a `where` as "no filter", so an unset viewer would
/// turn a delete of one person's row into a delete of everyone's.
function assertViewer(userId: string | undefined): asserts userId is string {
  if (!userId) throw new UnauthorizedException();
}

@Injectable()
export class TitleEngagementService {
  constructor(private readonly prisma: PrismaService) {}

  async react(
    titleId: string,
    userId: string | undefined,
    type: ReactionType,
  ): Promise<TitleEngagementDto> {
    assertViewer(userId);
    await this.assertTitleExists(titleId);

    // The delete answers "had they already cast this exact vote?" without a
    // separate read — its row count is the whole state machine. Both statements
    // run in one transaction so a failing write cannot leave the viewer's
    // previous vote deleted with nothing put back.
    //
    // Two *concurrent* clicks on the same vote still resolve last-writer-wins:
    // one deletes, the other finds nothing to delete and re-inserts. That is a
    // double-click, which the client prevents by disabling the control while
    // the request is in flight; the guarantee here is only that no state is lost.
    await this.prisma.$transaction(async (tx) => {
      const { count: withdrawn } = await tx.titleReaction.deleteMany({
        where: { titleId, userId, type },
      });
      if (withdrawn > 0) return;

      await tx.titleReaction.upsert({
        where: { titleId_userId: { titleId, userId } },
        create: { titleId, userId, type },
        update: { type },
      });
    });

    return this.summarize(titleId, userId);
  }

  async removeReaction(titleId: string, userId: string | undefined): Promise<TitleEngagementDto> {
    assertViewer(userId);
    await this.assertTitleExists(titleId);

    await this.prisma.titleReaction.deleteMany({ where: { titleId, userId } });
    return this.summarize(titleId, userId);
  }

  async addToWatchlist(titleId: string, userId: string | undefined): Promise<TitleEngagementDto> {
    assertViewer(userId);
    await this.assertTitleExists(titleId);

    await this.prisma.watchlistItem.upsert({
      where: { userId_titleId: { userId, titleId } },
      create: { userId, titleId },
      update: {},
    });

    return this.summarize(titleId, userId);
  }

  async removeFromWatchlist(
    titleId: string,
    userId: string | undefined,
  ): Promise<TitleEngagementDto> {
    assertViewer(userId);
    await this.assertTitleExists(titleId);

    await this.prisma.watchlistItem.deleteMany({ where: { userId, titleId } });
    return this.summarize(titleId, userId);
  }

  async summarize(titleId: string, viewerId?: string): Promise<TitleEngagementDto> {
    const summaries = await this.summarizeMany([titleId], viewerId);

    const summary = summaries.get(titleId);
    // summarizeMany answers for every id it is handed, so a miss means it stopped
    // doing that. Better a 500 than a write that succeeded reporting itself as zeroes.
    if (!summary) {
      throw new InternalServerErrorException(`No engagement summary built for title ${titleId}`);
    }
    return summary;
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
