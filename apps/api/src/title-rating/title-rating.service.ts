import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TitleRatingSummaryDto } from "./dto/response/title-rating-summary.dto";

@Injectable()
export class TitleRatingService {
  constructor(private readonly prisma: PrismaService) {}

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

    const byTitle = new Map(
      grouped.map((row) => [
        row.titleId,
        {
          average: row._avg.score === null ? null : Math.round(row._avg.score * 10) / 10,
          count: row._count._all,
        },
      ]),
    );

    // One entry per requested id — groupBy only answers for titles that have
    // ratings, and a caller must not have to tell "nobody rated it" apart from
    // "this id was never asked about".
    return new Map(
      titleIds.map((titleId) => [titleId, byTitle.get(titleId) ?? { average: null, count: 0 }]),
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
