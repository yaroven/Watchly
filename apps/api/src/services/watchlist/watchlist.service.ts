import { Injectable, Logger } from "@nestjs/common";
import { Logged } from "../../decorators/logged.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { TitleService } from "../title/title.service";
import { TitleView } from "../title/title.types";
import watchlistQuery from "./utils/watchlist.query";

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly titleService: TitleService,
  ) {}

  @Logged()
  async findAll(
    viewerId: string,
    { page = 1, limit = 10 }: { page?: number; limit?: number },
  ): Promise<{ items: TitleView[]; totalCount: number }> {
    const { titleIds, totalCount } = await this.findTitleIds(viewerId, { page, limit });
    if (titleIds.length === 0) return { items: [], totalCount };

    const titles = await this.titleService.findManyByIds(titleIds, viewerId);
    const byId = new Map(titles.map((title) => [title.id, title]));

    const missing = titleIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      this.logger.error(
        `Watchlist of user ${viewerId} references titles that no longer exist: ${missing.join(", ")}`,
      );
    }

    return {
      items: titleIds
        .map((id) => byId.get(id))
        .filter((title): title is TitleView => Boolean(title)),
      totalCount: totalCount - missing.length,
    };
  }

  @Logged()
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
