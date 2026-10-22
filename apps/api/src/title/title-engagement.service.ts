import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TitleEngagementDto } from "./dto/response/title-engagement.dto";
import titleQuery, { EngagementRelations } from "./utils/title.query";

export type EngagementClient = Pick<
  PrismaService,
  "title" | "titleRating" | "watchlistItem" | "titleEngagement"
>;

@Injectable()
export class TitleEngagementService {
  constructor(private readonly prisma: PrismaService) {}

  async rate(titleId: string, userId: string, score: number): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await tx.titleRating.upsert({
        where: { titleId_userId: { titleId, userId } },
        create: { titleId, userId, score },
        update: { score },
      });

      await this.recomputeRatingCounts(tx, titleId);
      return this.readEngagement(tx, titleId, userId);
    });
  }

  async removeRating(titleId: string, userId: string): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.titleRating.deleteMany({ where: { titleId, userId } });
      if (deleted.count === 0) {
        throw new NotFoundException("You have not rated this title");
      }

      await this.recomputeRatingCounts(tx, titleId);
      return this.readEngagement(tx, titleId, userId);
    });
  }

  async getEngagement(titleId: string, viewerId: string | null): Promise<TitleEngagementDto> {
    return this.readEngagement(this.prisma, titleId, viewerId);
  }

  async readEngagement(
    client: EngagementClient,
    titleId: string,
    viewerId: string | null,
  ): Promise<TitleEngagementDto> {
    const rows = (await client.title.findUnique({
      where: { id: titleId },
      select: titleQuery.engagementOnly(viewerId),
    })) as EngagementRelations | null;

    if (!rows) throw new NotFoundException(`Title with id ${titleId} not found`);

    return TitleEngagementDto.fromRelations(rows, viewerId);
  }

  async recomputeWatchlistCounts(client: EngagementClient, titleId: string): Promise<void> {
    const watchlistCount = await client.watchlistItem.count({ where: { titleId } });

    await this.writeCounts(client, titleId, { watchlistCount });
  }

  private async recomputeRatingCounts(client: EngagementClient, titleId: string): Promise<void> {
    const { _avg, _count } = await client.titleRating.aggregate({
      where: { titleId },
      _avg: { score: true },
      _count: { _all: true },
    });

    await this.writeCounts(client, titleId, {
      avgScore: _avg.score,
      ratingCount: _count._all,
    });
  }

  private async writeCounts(
    client: EngagementClient,
    titleId: string,
    counts: Omit<Prisma.TitleEngagementUncheckedCreateInput, "titleId">,
  ): Promise<void> {
    await client.titleEngagement.upsert({
      where: { titleId },
      create: { titleId, ...counts },
      update: counts,
    });
  }
}
