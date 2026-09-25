import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Genre, Prisma, Title, TitleType } from "@prisma/client";
import { paginate } from "../common/pagination/paginate.util";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../common/pagination/prisma-query.util";
import { settleAllOrLog } from "../common/settle-all-or-throw.util";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { MultipartUploadPart } from "../s3/multipart.constants";
import { S3Service } from "../s3/s3.service";
import { SeasonService } from "../season/season.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { TitleResponseDto } from "./dto/response/title-response.dto";
import { DEFAULT_TITLE_POSTER_URL } from "./title.constants";

@Injectable()
export class TitleService {
  private readonly logger = new Logger(TitleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly posterService: PosterService,
    private readonly videoTranscoderService: VideoTranscoderService,
    private readonly seasonService: SeasonService,
  ) {}

  async create(data: CreateTitleDto): Promise<TitleResponseDto> {
    const { genreIds, ...rest } = data;

    try {
      const title = await this.prisma.title.create({
        data: {
          ...rest,
          posterUrl: DEFAULT_TITLE_POSTER_URL,
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
    const where = buildWhere(filters) as Prisma.TitleWhereInput;
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
    await this.posterService.assertManagedPosterUrl(
      "titles",
      id,
      data.posterUrl,
      DEFAULT_TITLE_POSTER_URL,
    );

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
    return this.s3Service.startMultipartUpload(id, BucketType.RAW, fileSize, 3600);
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
    await this.s3Service.completeMultipartUpload(id, BucketType.RAW, uploadId, parts);
  }

  async abortMovieUpload(id: string, uploadId: string): Promise<void> {
    await this.s3Service.abortMultipartUpload(id, BucketType.RAW, uploadId);
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

    await this.videoTranscoderService.scheduleTranscodeVideo({
      id,
      type: VideoType.MOVIE,
    });
  }

  async getMovieUrl(id: string): Promise<{ url: string }> {
    const url = await this.s3Service.getReadPresignedUrl(
      `videos/${id}/master.m3u8`,
      BucketType.PROCESSED,
    );
    return { url };
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
      this.videoTranscoderService.cleanupVideoAsset(id, VideoType.MOVIE, `videos/${id}/`),
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
}
