import { Injectable } from "@nestjs/common";
import { Logged } from "../../decorators/logged.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { TitleEngagementService } from "../title/title-engagement.service";
import { TitleEngagementView } from "../title/title-engagement.types";
import { TitleService } from "../title/title.service";
import { CardTitleView } from "../title/title.types";
import watchlistQuery from "./utils/watchlist.query";

@Injectable()
export class WatchlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly titleService: TitleService,
    private readonly engagementService: TitleEngagementService,
  ) {}

  @Logged()
  async add(titleId: string, userId: string): Promise<TitleEngagementView> {
    return this.prisma.$transaction(async (tx) => {
      await tx.watchlistItem.upsert({
        where: { userId_titleId: { userId, titleId } },
        create: { userId, titleId },
        update: {},
      });

      await this.engagementService.recomputeWatchlistCounts(tx, titleId);
      return this.engagementService.readEngagement(tx, titleId, userId);
    });
  }

  @Logged()
  async remove(titleId: string, userId: string): Promise<TitleEngagementView> {
    return this.prisma.$transaction(async (tx) => {
      await tx.watchlistItem.deleteMany({ where: { userId, titleId } });
      await this.engagementService.recomputeWatchlistCounts(tx, titleId);
      return this.engagementService.readEngagement(tx, titleId, userId);
    });
  }

  @Logged()
  async findAll(
    viewerId: string,
    { page = 1, limit = 10 }: { page?: number; limit?: number },
  ): Promise<{ items: CardTitleView[]; totalCount: number }> {
    const { titleIds, totalCount } = await this.findTitleIds(viewerId, { page, limit });
    if (titleIds.length === 0) return { items: [], totalCount };

    const titles = await this.titleService.findManyByIds(titleIds, viewerId);
    const byId = new Map(titles.map((title) => [title.id, title]));
    const items = titleIds
      .map((id) => byId.get(id))
      .filter((title): title is CardTitleView => Boolean(title));

    return { items, totalCount: totalCount - (titleIds.length - items.length) };
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
