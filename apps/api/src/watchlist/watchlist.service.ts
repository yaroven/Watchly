import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TitleEngagementDto } from "../title/dto/response/title-engagement.dto";
import { TitleResponseDto } from "../title/dto/response/title-response.dto";
import { TitleService } from "../title/title.service";
import watchlistQuery from "./utils/watchlist.query";

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly titleService: TitleService,
  ) {}

  async add(titleId: string, userId: string): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await tx.watchlistItem.upsert({
        where: { userId_titleId: { userId, titleId } },
        create: { userId, titleId },
        update: {},
      });

      await this.titleService.recomputeWatchlistCounts(tx, titleId);
      return this.titleService.readEngagement(tx, titleId, userId);
    });
  }

  async remove(titleId: string, userId: string): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await tx.watchlistItem.deleteMany({ where: { userId, titleId } });
      await this.titleService.recomputeWatchlistCounts(tx, titleId);
      return this.titleService.readEngagement(tx, titleId, userId);
    });
  }

  /// Newest addition first. The ordering lives in the id list and nowhere else:
  /// `findManyByIds` returns rows in whatever order the database finds
  /// convenient, so the rows are re-sorted back onto `titleIds` below.
  async findAll(
    viewerId: string,
    { page = 1, limit = 10 }: { page?: number; limit?: number },
  ): Promise<{ items: TitleResponseDto[]; totalCount: number }> {
    const { titleIds, totalCount } = await this.findTitleIds(viewerId, { page, limit });
    if (titleIds.length === 0) return { items: [], totalCount };

    const titles = await this.titleService.findManyByIds(titleIds, viewerId);
    const byId = new Map(titles.map((title) => [title.id, title]));

    // The ids were already filtered through `title`, so a gap here means a row
    // vanished between the id page and this read — rare, and not something to
    // paper over with a short page and an unchanged count.
    const missing = titleIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      this.logger.error(
        `Watchlist of user ${viewerId} references titles that no longer exist: ${missing.join(", ")}`,
      );
    }

    return {
      items: titleIds
        .map((id) => byId.get(id))
        .filter((title): title is TitleResponseDto => Boolean(title)),
      totalCount: totalCount - missing.length,
    };
  }

  private async findTitleIds(
    userId: string,
    page: { page?: number; limit?: number },
  ): Promise<{ titleIds: string[]; totalCount: number }> {
    const [items, totalCount] = await Promise.all([
      this.prisma.watchlistItem.findMany(watchlistQuery.titleIds(userId, page)),
      this.prisma.watchlistItem.count({ where: watchlistQuery.forViewer(userId) }),
    ]);

    return { titleIds: items.map((item) => item.titleId), totalCount };
  }
}
