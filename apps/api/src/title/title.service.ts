import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Genre, Prisma, Title, TitleType } from "@prisma/client";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { paginate } from "../common/pagination/paginate.util";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../common/pagination/prisma-query.util";
import { settleAllOrLog } from "../common/settle-all-or-throw.util";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { MultipartUploadPart } from "../s3/multipart.constants";
import { SeasonService } from "../season/season.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { CastCreditInputDto } from "./dto/request/set-title-cast.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { CastCreditResponseDto } from "./dto/response/cast-credit-response.dto";
import { TitleResponseDto } from "./dto/response/title-response.dto";

@Injectable()
export class TitleService {
  private readonly logger = new Logger(TitleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posterService: PosterService,
    private readonly seasonService: SeasonService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  async create(data: CreateTitleDto): Promise<TitleResponseDto> {
    const { genreIds, ...rest } = data;

    try {
      const title = await this.prisma.title.create({
        data: {
          ...rest,
          genres: genreIds?.length ? { connect: genreIds.map((id) => ({ id })) } : undefined,
        },
        include: { genres: true },
      });
      return new TitleResponseDto(title);
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

    const { items, totalCount } = await paginate<Title & { genres: Genre[] }>(this.prisma.title, {
      where,
      orderBy,
      page,
      limit,
      extra: { include: { genres: true } },
    });

    return { items: items.map((title) => new TitleResponseDto(title)), totalCount };
  }

  async findOne(id: string): Promise<TitleResponseDto | null> {
    const title = await this.prisma.title.findUnique({ where: { id }, include: { genres: true } });
    return title ? new TitleResponseDto(title) : null;
  }

  async update(id: string, data: UpdateTitleDto): Promise<TitleResponseDto> {
    const title = await this.findOne(id);
    if (!title) {
      throw new BadRequestException(`Title with id ${id} not found`);
    }
    if (data.posterUrl !== undefined) {
      await this.posterService.assertManagedPosterUrl("titles", id, data.posterUrl);
    }

    const { genreIds, ...rest } = data;

    try {
      const updated = await this.prisma.title.update({
        where: { id },
        data: {
          ...rest,
          genres:
            genreIds !== undefined
              ? { set: genreIds.map((genreId) => ({ id: genreId })) }
              : undefined,
        },
        include: { genres: true },
      });
      return new TitleResponseDto(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new BadRequestException("One or more genreIds do not exist");
      }
      throw error;
    }
  }

  async startMovieUpload(id: string, fileSize: number) {
    const movie = await this.findOne(id);
    if (!movie) {
      throw new BadRequestException(`Movie with id ${id} not found`);
    }
    return this.mediaAssetService.startUpload(id, fileSize);
  }

  async completeMovieUpload(
    id: string,
    uploadId: string,
    parts: MultipartUploadPart[],
  ): Promise<void> {
    const movie = await this.findOne(id);
    if (!movie) {
      throw new BadRequestException(`Movie with id ${id} not found`);
    }
    await this.mediaAssetService.completeUpload(id, uploadId, parts);
  }

  async abortMovieUpload(id: string, uploadId: string): Promise<void> {
    await this.mediaAssetService.abortUpload(id, uploadId);
  }

  async createPosterUploadingUrl(id: string): Promise<{ uploadUrl: string; posterUrl: string }> {
    const title = await this.findOne(id);
    if (!title) {
      throw new BadRequestException(`Title with id ${id} not found`);
    }

    return this.posterService.createUploadUrl("titles", id);
  }

  async transcode(id: string): Promise<void> {
    const title = await this.findOne(id);

    if (!title) {
      throw new BadRequestException(`Movie with id ${id} not found`);
    }

    await this.mediaAssetService.scheduleTranscode(id, VideoType.MOVIE);
  }

  async getMovieUrl(id: string): Promise<{ url: string }> {
    const url = await this.mediaAssetService.getReadUrl(`videos/${id}/master.m3u8`);
    if (!url) {
      throw new NotFoundException(`No media for title ${id}`);
    }
    return url;
  }

  async delete(id: string): Promise<TitleResponseDto> {
    const title = await this.prisma.title.findUnique({
      where: { id },
      include: {
        seasons: { include: { episodes: true } },
      },
    });

    if (!title) {
      throw new BadRequestException(`Title with id ${id} not found`);
    }

    const deleted = await this.prisma.title.delete({ where: { id }, include: { genres: true } });

    await Promise.all([
      this.posterService
        .deletePoster("titles", id)
        .catch((error: unknown) =>
          this.logger.error(`Failed to clean up poster after deleting title ${id}`, error),
        ),
      this.mediaAssetService.cleanupVideoAsset(id, VideoType.MOVIE, `videos/${id}/`),
      title.type === TitleType.SERIES &&
        settleAllOrLog(
          title.seasons,
          (season) => this.seasonService.cleanupAssets(season),
          (season) => season.id,
          this.logger,
          { itemLabel: "season", parentLabel: "title", parentId: id },
        ),
    ]);

    return new TitleResponseDto(deleted);
  }

  async getCast(id: string): Promise<CastCreditResponseDto[]> {
    const title = await this.findOne(id);
    if (!title) {
      throw new BadRequestException(`Title with id ${id} not found`);
    }

    const credits = await this.prisma.castCredit.findMany({
      where: { titleId: id },
      include: { artist: true },
      orderBy: { order: "asc" },
    });

    return credits.map((credit) => new CastCreditResponseDto(credit));
  }

  async setCast(id: string, credits: CastCreditInputDto[]): Promise<CastCreditResponseDto[]> {
    const title = await this.findOne(id);
    if (!title) {
      throw new BadRequestException(`Title with id ${id} not found`);
    }

    try {
      await this.prisma.$transaction([
        this.prisma.castCredit.deleteMany({ where: { titleId: id } }),
        this.prisma.castCredit.createMany({
          data: credits.map((credit, index) => ({
            titleId: id,
            artistId: credit.artistId,
            character: credit.character,
            order: credit.order ?? index,
          })),
        }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new BadRequestException("One or more artistId values do not exist");
      }
      throw error;
    }

    return this.getCast(id);
  }
}
