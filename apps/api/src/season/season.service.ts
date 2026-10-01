import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Episode, Prisma, Season } from "@prisma/client";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../common/pagination/prisma-query.util";
import { settleAllOrLog } from "../common/settle-all-or-throw.util";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { buildSeasonVideoPrefix } from "../s3/processed-key";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { CreateSeasonDto } from "./dto/request/create-season.dto";
import { UpdateSeasonDto } from "./dto/request/update-season.dto";
import { SeasonResponseDto } from "./dto/response/season-response.dto";

@Injectable()
export class SeasonService {
  private readonly logger = new Logger(SeasonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posterService: PosterService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  async create(data: CreateSeasonDto): Promise<SeasonResponseDto> {
    try {
      const season = await this.prisma.season.create({ data });
      return this.toResponse(season);
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
    return seasons.map((season) => this.toResponse(season));
  }

  async findOne(id: string): Promise<SeasonResponseDto | null> {
    const season = await this.prisma.season.findUnique({ where: { id } });
    return season ? this.toResponse(season) : null;
  }

  async update(id: string, data: UpdateSeasonDto): Promise<SeasonResponseDto> {
    const season = await this.findOne(id);
    if (!season) {
      throw new BadRequestException(`Season with id ${id} not found`);
    }

    const { posterUploaded, ...rest } = data;

    const updated = await this.prisma.season.update({
      where: { id },
      data: {
        ...rest,
        ...(posterUploaded === undefined
          ? {}
          : {
              posterKey: posterUploaded
                ? await this.posterService.confirmUpload("seasons", id)
                : null,
            }),
      },
    });
    return this.toResponse(updated);
  }

  private toResponse(season: Season): SeasonResponseDto {
    return new SeasonResponseDto(season, this.posterService.toPublicUrl(season.posterKey));
  }

  async createPosterUploadingUrl(id: string): Promise<{ uploadUrl: string }> {
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

    return this.toResponse(deleted);
  }

  /**
   * Best-effort storage/queue cleanup for a season whose DB row (and cascaded
   * episodes) is already deleted. Called both from `delete` and from
   * TitleService when a whole series is removed.
   */
  async cleanupAssets(season: Season & { episodes: Episode[] }): Promise<void> {
    await settleAllOrLog(
      season.episodes,
      (episode) => this.mediaAssetService.cleanupVideoAsset(episode.id, VideoType.EPISODE),
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
            this.mediaAssetService.deleteProcessedFolder(
              buildSeasonVideoPrefix(season.titleId, season.id),
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
