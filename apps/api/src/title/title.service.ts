import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, TitleType } from "@prisma/client";
import { paginate } from "../common/pagination/paginate.util";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy } from "../common/pagination/prisma-query.util";
import { settleAllOrLog } from "../common/utils/settle-all-or-throw.util";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { ViewerVotesService } from "../reaction/viewer-votes.service";
import { buildVideoPrefix } from "../s3/processed-key";
import { SeasonService } from "../season/season.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { NO_VOTE_OVERRIDES, VoteOverrides } from "../vote-cache/vote-cache.const";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { TitleEngagementDto } from "./dto/response/title-engagement.dto";
import { TitleResponseDto } from "./dto/response/title-response.dto";
import assertTitleExists from "./utils/assert-title-exists.util";
import { buildTitleWhere } from "./utils/title-filter.query";
import titleQuery, { TitleWithEngagement } from "./utils/title.query";

@Injectable()
export class TitleService {
  private readonly logger = new Logger(TitleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posterService: PosterService,
    private readonly seasonService: SeasonService,
    private readonly mediaAssetService: MediaAssetService,
    private readonly viewerVotes: ViewerVotesService,
  ) {}

  async create({ genreIds, ...rest }: CreateTitleDto): Promise<TitleResponseDto> {
    try {
      const title = await this.prisma.title.create({
        data: {
          ...rest,
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
    const where = buildTitleWhere(filters);
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

    const votes = await this.viewerVotes.forPage("title", items, viewerId ?? null);

    return {
      items: items.map((title) => this.toResponse(title, viewerId ?? null, votes)),
      totalCount,
    };
  }

  async findOne(id: string, viewerId?: string): Promise<TitleResponseDto | null> {
    const title = (await this.prisma.title.findUnique({
      where: { id },
      include: titleQuery.withEngagement(viewerId ?? null),
    })) as TitleWithEngagement | null;
    if (!title) return null;

    return this.toResponse(
      title,
      viewerId ?? null,
      await this.viewerVotes.forPage("title", [title], viewerId ?? null),
    );
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
          genres:
            genreIds !== undefined
              ? { set: genreIds.map((genreId) => ({ id: genreId })) }
              : undefined,
        },
        include: titleQuery.withEngagement(viewerId ?? null),
      })) as TitleWithEngagement;

      return this.toResponse(
        updated,
        viewerId ?? null,
        await this.viewerVotes.forPage("title", [updated], viewerId ?? null),
      );
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

  async findManyByIds(titleIds: string[], viewerId: string | null): Promise<TitleResponseDto[]> {
    if (titleIds.length === 0) return [];

    const titles = (await this.prisma.title.findMany({
      where: { id: { in: titleIds } },
      include: titleQuery.withEngagement(viewerId),
    })) as TitleWithEngagement[];

    const votes = await this.viewerVotes.forPage("title", titles, viewerId);

    return titles.map((title) => this.toResponse(title, viewerId, votes));
  }

  private toResponse(
    title: TitleWithEngagement,
    viewerId: string | null,
    votes: VoteOverrides = NO_VOTE_OVERRIDES,
  ): TitleResponseDto {
    return new TitleResponseDto(
      title,
      TitleEngagementDto.fromRelations(title, viewerId, votes.get(title.id)),
      this.posterService.toPublicUrl(title.posterKey),
    );
  }
}
