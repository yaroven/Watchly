import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, ReactionType, TitleType } from "@prisma/client";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { paginate } from "../common/pagination/paginate.util";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../common/pagination/prisma-query.util";
import { settleAllOrLog } from "../common/utils/settle-all-or-throw.util";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { buildVideoPrefix } from "../s3/processed-key";
import { SeasonService } from "../season/season.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { TitleEngagementDto } from "./dto/response/title-engagement.dto";
import { TitleResponseDto } from "./dto/response/title-response.dto";
import assertTitleExists from "./utils/assert-title-exists.util";
import titleQuery, { EngagementRelations, TitleWithEngagement } from "./utils/title.query";

type EngagementClient = Pick<
  PrismaService,
  "title" | "titleRating" | "titleReaction" | "watchlistItem" | "titleEngagement"
>;

@Injectable()
export class TitleService {
  private readonly logger = new Logger(TitleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posterService: PosterService,
    private readonly seasonService: SeasonService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  async create({ genreIds, ...rest }: CreateTitleDto): Promise<TitleResponseDto> {
    try {
      const title = await this.prisma.title.create({
        data: {
          ...rest,
          releaseDate: new Date(rest.releaseDate),
          genres: genreIds?.length ? { connect: genreIds.map((id) => ({ id })) } : undefined,
        },
        include: titleQuery.base(),
      });
      return TitleResponseDto.withoutEngagement(title);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new BadRequestException("One or more genreIds do not exist");
      }
      throw error;
    }
  }

  async findAll(
    { page = 1, limit = 10 }: GetAllTitleDto,
    sort?: Sorting,
    filters: Filter[] = [],
    viewerId?: string,
  ): Promise<{ items: TitleResponseDto[]; totalCount: number }> {
    const genreFilters = filters.filter((filter) => filter.property === "genres");
    const scalarFilters = filters.filter((filter) => filter.property !== "genres");

    const where = buildWhere(scalarFilters) as Prisma.TitleWhereInput;
    if (genreFilters.length) {
      const genreIds = genreFilters.flatMap((filter) =>
        filter.rule === FilterRule.IN ? filter.value.split(",") : [filter.value],
      );
      where.genres = { some: { id: { in: genreIds } } };
    }
    const orderBy = (buildOrderBy(sort) ?? {
      createdAt: "desc",
    }) as Prisma.TitleOrderByWithRelationInput;

    const { items, totalCount } = await paginate<TitleWithEngagement>(this.prisma.title, {
      where,
      orderBy,
      page,
      limit,
      extra: { include: titleQuery.withEngagement(viewerId ?? null) },
    });

    return {
      items: items.map((title) => this.toResponse(title, viewerId ?? null)),
      totalCount,
    };
  }

  async findOne(id: string, viewerId?: string): Promise<TitleResponseDto | null> {
    const title = (await this.prisma.title.findUnique({
      where: { id },
      include: titleQuery.withEngagement(viewerId ?? null),
    })) as TitleWithEngagement | null;
    if (!title) return null;

    return this.toResponse(title, viewerId ?? null);
  }

  async update(
    id: string,
    { genreIds, posterUploaded, ...rest }: UpdateTitleDto,
    viewerId?: string,
  ): Promise<TitleResponseDto> {
    await assertTitleExists(this.prisma, id);

    if (posterUploaded === false) {
      await this.posterService.removeStoredImage("titles", id);
    }
    const posterKey = posterUploaded === false ? null : undefined;

    try {
      const updated = (await this.prisma.title.update({
        where: { id },
        data: {
          ...rest,
          ...(posterKey !== undefined ? { posterKey } : {}),
          ...(rest.releaseDate !== undefined ? { releaseDate: new Date(rest.releaseDate) } : {}),
          genres:
            genreIds !== undefined
              ? { set: genreIds.map((genreId) => ({ id: genreId })) }
              : undefined,
        },
        include: titleQuery.withEngagement(viewerId ?? null),
      })) as TitleWithEngagement;

      return this.toResponse(updated, viewerId ?? null);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        await assertTitleExists(this.prisma, id);
        throw new BadRequestException("One or more genreIds do not exist");
      }
      throw error;
    }
  }

  async delete(id: string): Promise<TitleResponseDto> {
    const title = await this.prisma.title.findUnique({
      where: { id },
      include: titleQuery.assets(),
    });

    if (!title) {
      throw new NotFoundException(`Title with id ${id} not found`);
    }

    const deleted = await this.prisma.title.delete({
      where: { id },
      include: titleQuery.deleted(),
    });

    await Promise.all([
      this.posterService.deleteStoredImage(title.posterKey),
      this.mediaAssetService.cleanupVideoAsset(
        id,
        VideoType.MOVIE,
        buildVideoPrefix({ type: VideoType.MOVIE, titleId: id }),
      ),
      title.type === TitleType.SERIES &&
        settleAllOrLog(
          title.seasons,
          (season) => this.seasonService.cleanupAssets(season),
          (season) => season.id,
          this.logger,
          { itemLabel: "season", parentLabel: "title", parentId: id },
        ),
    ]);

    return TitleResponseDto.withoutEngagement(deleted);
  }

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

  async react(titleId: string, userId: string, type: ReactionType): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
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

      await this.recomputeReactionCounts(tx, titleId);
      return this.readEngagement(tx, titleId, userId);
    });
  }

  async removeReaction(titleId: string, userId: string): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await tx.titleReaction.deleteMany({ where: { titleId, userId } });
      await this.recomputeReactionCounts(tx, titleId);
      return this.readEngagement(tx, titleId, userId);
    });
  }

  async getEngagement(titleId: string, viewerId: string | null): Promise<TitleEngagementDto> {
    return this.readEngagement(this.prisma, titleId, viewerId);
  }

  async findManyByIds(titleIds: string[], viewerId: string | null): Promise<TitleResponseDto[]> {
    if (titleIds.length === 0) return [];

    const titles = (await this.prisma.title.findMany({
      where: { id: { in: titleIds } },
      include: titleQuery.withEngagement(viewerId),
    })) as TitleWithEngagement[];

    return titles.map((title) => this.toResponse(title, viewerId));
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

  private async recomputeReactionCounts(client: EngagementClient, titleId: string): Promise<void> {
    const rows = await client.titleReaction.groupBy({
      by: ["type"],
      where: { titleId },
      _count: { _all: true },
    });

    const byType = new Map(rows.map((row) => [row.type, row._count._all] as const));

    await this.writeCounts(client, titleId, {
      likes: byType.get(ReactionType.LIKE) ?? 0,
      dislikes: byType.get(ReactionType.DISLIKE) ?? 0,
    });
  }

  async recomputeWatchlistCounts(client: EngagementClient, titleId: string): Promise<void> {
    const watchlistCount = await client.watchlistItem.count({ where: { titleId } });

    await this.writeCounts(client, titleId, { watchlistCount });
  }

  private toResponse(title: TitleWithEngagement, viewerId: string | null): TitleResponseDto {
    return new TitleResponseDto(
      title,
      TitleEngagementDto.fromRelations(title, viewerId),
      this.posterService.toPublicUrl(title.posterKey),
    );
  }
}
