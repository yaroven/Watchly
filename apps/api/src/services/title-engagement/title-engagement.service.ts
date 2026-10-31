import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Logged } from "../../decorators/logged.decorator";
import { PrismaService } from "../prisma/prisma.service";
import titleQuery, { EngagementRelations } from "../title/utils/title.query";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { titleEngagementViewFromRelations } from "./title-engagement.mapper";
import { TitleEngagementView } from "./title-engagement.types";

export type EngagementClient = Pick<
  PrismaService,
  "title" | "titleRating" | "watchlistItem" | "titleEngagement"
>;

@Injectable()
export class TitleEngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly voteState: VoteStateService,
  ) {}

  @Logged()
  async rate(titleId: string, userId: string, score: number): Promise<TitleEngagementView> {
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

  @Logged()
  async removeRating(titleId: string, userId: string): Promise<TitleEngagementView> {
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.titleRating.deleteMany({ where: { titleId, userId } });
      if (deleted.count === 0) {
        throw new NotFoundException("You have not rated this title");
      }

      await this.recomputeRatingCounts(tx, titleId);
      return this.readEngagement(tx, titleId, userId);
    });
  }

  @Logged()
  async getEngagement(titleId: string, viewerId: string | null): Promise<TitleEngagementView> {
    return this.readEngagement(this.prisma, titleId, viewerId);
  }

  @Logged()
  async readEngagement(
    client: EngagementClient,
    titleId: string,
    viewerId: string | null,
  ): Promise<TitleEngagementView> {
    const rows = (await client.title.findUnique({
      where: { id: titleId },
      select: titleQuery.engagementOnly(viewerId),
    })) as EngagementRelations | null;

    if (!rows) throw new NotFoundException(`Title with id ${titleId} not found`);

    const votes = await this.voteState.forTitles([{ id: titleId }], viewerId);

    return titleEngagementViewFromRelations(rows, viewerId, votes.get(titleId));
  }

  @Logged()
  async recomputeWatchlistCounts(client: EngagementClient, titleId: string): Promise<void> {
    const watchlistCount = await client.watchlistItem.count({ where: { titleId } });

    await this.writeCounts(client, titleId, { watchlistCount });
  }

  @Logged()
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

  @Logged()
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
