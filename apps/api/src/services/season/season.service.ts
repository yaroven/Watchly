import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Episode, Prisma, Season } from "@prisma/client";
import { Filter, Sorting } from "../../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../../common/pagination/prisma-query.util";
import { settleAllOrLog } from "../../common/utils/settle-all-or-throw.util";
import { ImageService } from "../image/image.service";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PrismaService } from "../prisma/prisma.service";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { buildSeasonVideoPrefix } from "../s3/processed-key";
import { toSeasonView } from "./season.mapper";
import { SeasonInput, SeasonView } from "./season.types";

@Injectable()
export class SeasonService {
  private readonly logger = new Logger(SeasonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  async create(data: SeasonInput): Promise<SeasonView> {
    try {
      const season = await this.prisma.season.create({ data });
      return this.toView(season);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new NotFoundException(`Title with id ${data.titleId} not found`);
      }
      throw error;
    }
  }

  async findAll(filters: Filter[] = [], sort?: Sorting): Promise<SeasonView[]> {
    const where = buildWhere(filters) as Prisma.SeasonWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      number: "asc",
    }) as Prisma.SeasonOrderByWithRelationInput;

    const seasons = await this.prisma.season.findMany({ where, orderBy });
    return seasons.map((season) => this.toView(season));
  }

  async findOne(id: string): Promise<SeasonView | null> {
    const season = await this.prisma.season.findUnique({ where: { id } });
    return season ? this.toView(season) : null;
  }

  async update(id: string, data: SeasonInput): Promise<SeasonView> {
    const updated = await this.prisma.season.update({ where: { id }, data });
    return this.toView(updated);
  }

  private toView(season: Season): SeasonView {
    return toSeasonView(season, this.imageService.toPublicUrl(season.posterKey));
  }

  async delete(id: string): Promise<SeasonView> {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: { episodes: true },
    });

    if (!season) {
      throw new NotFoundException(`Season with id ${id} not found`);
    }

    const deleted = await this.prisma.season.delete({ where: { id } });
    await this.cleanupAssets(season);

    return this.toView(deleted);
  }

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
        { id: "poster", run: () => this.imageService.deleteStoredImage(season.posterKey) },
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
