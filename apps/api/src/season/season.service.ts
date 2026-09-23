import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Episode, Prisma, Season } from "@prisma/client";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../common/pagination/prisma-query.util";
import { settleAllOrLog } from "../common/settle-all-or-throw.util";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { CreateSeasonDto } from "./dto/request/create-season.dto";
import { UpdateSeasonDto } from "./dto/request/update-season.dto";
import { SeasonResponseDto } from "./dto/response/season-response.dto";

@Injectable()
export class SeasonService {
  private readonly logger = new Logger(SeasonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly posterService: PosterService,
    private readonly videoTranscoderService: VideoTranscoderService,
  ) {}

  async create(data: CreateSeasonDto): Promise<SeasonResponseDto> {
    try {
      const season = await this.prisma.season.create({ data });
      return new SeasonResponseDto(season);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new BadRequestException(`Title with id ${data.titleId} not found`);
      }
      throw error;
    }
  }

  async findAll(filters: Filter[] = [], sort?: Sorting): Promise<SeasonResponseDto[]> {
    const where = buildWhere(filters) as Prisma.SeasonWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      number: "asc",
    }) as Prisma.SeasonOrderByWithRelationInput;

    const seasons = await this.prisma.season.findMany({ where, orderBy });
    return seasons.map((season) => new SeasonResponseDto(season));
  }

  async findOne(id: string): Promise<SeasonResponseDto | null> {
    const season = await this.prisma.season.findUnique({ where: { id } });
    return season ? new SeasonResponseDto(season) : null;
  }

  async update(id: string, data: UpdateSeasonDto): Promise<SeasonResponseDto> {
    const season = await this.findOne(id);
    if (!season) {
      throw new BadRequestException(`Season with id ${id} not found`);
    }

    if (data.posterUrl !== undefined) {
      await this.posterService.assertManagedPosterUrl("seasons", id, data.posterUrl);
    }

    const updated = await this.prisma.season.update({ where: { id }, data });
    return new SeasonResponseDto(updated);
  }

  async createPosterUploadingUrl(id: string): Promise<{ uploadUrl: string; posterUrl: string }> {
    const season = await this.findOne(id);
    if (!season) {
      throw new BadRequestException(`Season with id ${id} not found`);
    }

    return this.posterService.createUploadUrl("seasons", id);
  }

  async delete(id: string): Promise<SeasonResponseDto> {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: { episodes: true },
    });

    if (!season) {
      throw new BadRequestException(`Season with id ${id} not found`);
    }

    const deleted = await this.prisma.season.delete({ where: { id } });
    await this.cleanupAssets(season);

    return new SeasonResponseDto(deleted);
  }

  /**
   * Best-effort storage/queue cleanup for a season whose DB row (and cascaded
   * episodes) is already deleted. Called both from `delete` and from
   * TitleService when a whole series is removed.
   */
  async cleanupAssets(season: Season & { episodes: Episode[] }): Promise<void> {
    await settleAllOrLog(
      season.episodes,
      async (episode) => {
        await this.videoTranscoderService.cancelScheduledTranscodes(episode.id, VideoType.EPISODE);
        await this.s3Service.deleteObject(episode.id, BucketType.RAW);
      },
      (episode) => episode.id,
      this.logger,
      { itemLabel: "episode", parentLabel: "season", parentId: season.id },
    );

    await settleAllOrLog(
      [
        { id: "poster", run: () => this.posterService.deletePoster("seasons", season.id) },
        {
          id: "processed-folder",
          run: () =>
            this.s3Service.deleteFolder(
              `videos/${season.titleId}/${season.id}/`,
              BucketType.PROCESSED,
            ),
        },
      ],
      (task) => task.run(),
      (task) => task.id,
      this.logger,
      { itemLabel: "asset", parentLabel: "season", parentId: season.id },
    );
  }
}
