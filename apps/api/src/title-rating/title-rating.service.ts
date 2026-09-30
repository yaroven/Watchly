import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TitleRatingSummaryDto } from "./dto/response/title-rating-summary.dto";

@Injectable()
export class TitleRatingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert rather than create: a score is one opinion per person that they are
   * free to revise, so re-rating replaces the old value instead of stacking a
   * second row. The unique index on (titleId, userId) is what makes that safe
   * under concurrent requests.
   */
  async set(titleId: string, userId: string, score: number): Promise<TitleRatingSummaryDto> {
    await this.assertTitleExists(titleId);

    await this.prisma.titleRating.upsert({
      where: { titleId_userId: { titleId, userId } },
      create: { titleId, userId, score },
      update: { score },
    });

    return this.summarize(titleId, userId);
  }

  async remove(titleId: string, userId: string): Promise<TitleRatingSummaryDto> {
    const deleted = await this.prisma.titleRating.deleteMany({ where: { titleId, userId } });
    if (deleted.count === 0) {
      throw new NotFoundException("You have not rated this title");
    }

    return this.summarize(titleId, userId);
  }

  /**
   * The Watchly score. Computed on read: the row count is small per title and
   * a stored average is one more thing that can drift from the rows it claims
   * to summarise.
   */
  async summarize(titleId: string, userId?: string): Promise<TitleRatingSummaryDto> {
    const [aggregate, mine] = await Promise.all([
      this.prisma.titleRating.aggregate({
        where: { titleId },
        _avg: { score: true },
        _count: { _all: true },
      }),
      userId
        ? this.prisma.titleRating.findUnique({
            where: { titleId_userId: { titleId, userId } },
            select: { score: true },
          })
        : null,
    ]);

    return new TitleRatingSummaryDto({
      average: aggregate._avg.score,
      count: aggregate._count._all,
      myScore: mine?.score ?? null,
    });
  }

  /** Averages for many titles at once — a list screen would otherwise issue one query per row. */
  async summarizeMany(
    titleIds: string[],
  ): Promise<Map<string, { average: number | null; count: number }>> {
    if (titleIds.length === 0) return new Map();

    const grouped = await this.prisma.titleRating.groupBy({
      by: ["titleId"],
      where: { titleId: { in: titleIds } },
      _avg: { score: true },
      _count: { _all: true },
    });

    return new Map(
      grouped.map((row) => [
        row.titleId,
        {
          average: row._avg.score === null ? null : Math.round(row._avg.score * 10) / 10,
          count: row._count._all,
        },
      ]),
    );
  }

  private async assertTitleExists(titleId: string) {
    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      select: { id: true },
    });
    if (!title) throw new BadRequestException(`Title with id ${titleId} not found`);
  }
}
