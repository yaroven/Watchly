import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Filter, Sorting } from "../../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../../common/pagination/prisma-query.util";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PrismaService } from "../prisma/prisma.service";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { buildVideoPrefix } from "../s3/processed-key";
import { toEpisodeView } from "./episode.mapper";
import { EpisodeInput, EpisodeUpdate, EpisodeView } from "./episode.types";
import { getEpisodeTitleAndSeasonId } from "./utils/episode-path.util";

@Injectable()
export class EpisodeService {
  private readonly logger = new Logger(EpisodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  async create(data: EpisodeInput): Promise<EpisodeView> {
    try {
      const episode = await this.prisma.episode.create({ data });
      return toEpisodeView(episode);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2003")
      ) {
        throw new BadRequestException(
          error.code === "P2002"
            ? `Episode with number ${data.number} already exists in this season`
            : `Season with id ${data.seasonId} not found`,
        );
      }
      throw error;
    }
  }

  async findAll(filters: Filter[] = [], sort?: Sorting): Promise<EpisodeView[]> {
    const where = buildWhere(filters) as Prisma.EpisodeWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      number: "asc",
    }) as Prisma.EpisodeOrderByWithRelationInput;

    const episodes = await this.prisma.episode.findMany({ where, orderBy });
    return episodes.map(toEpisodeView);
  }

  async findOneDetailed(id: string) {
    return this.prisma.episode.findUnique({
      where: { id },
      include: { season: { include: { title: true } } },
    });
  }

  async findOne(id: string): Promise<EpisodeView | null> {
    const episode = await this.prisma.episode.findUnique({ where: { id } });
    return episode ? toEpisodeView(episode) : null;
  }

  async update(id: string, data: EpisodeUpdate): Promise<EpisodeView> {
    const episode = await this.findOne(id);
    if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

    const existingEpisode = await this.prisma.episode.findFirst({
      where: {
        seasonId: episode.seasonId,
        number: data.number,
        id: { not: id },
      },
    });

    if (existingEpisode)
      throw new BadRequestException(
        `Episode with number ${data.number} already exists in this season`,
      );

    try {
      const updated = await this.prisma.episode.update({ where: { id }, data });
      return toEpisodeView(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(
          `Episode with number ${data.number} already exists in this season`,
        );
      }
      throw error;
    }
  }

  async delete(id: string): Promise<EpisodeView> {
    const episode = await this.findOneDetailed(id);
    if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

    const { seasonId, titleId } = getEpisodeTitleAndSeasonId(episode);

    const deleted = await this.prisma.episode.delete({ where: { id } });

    await this.mediaAssetService.cleanupVideoAsset(
      id,
      VideoType.EPISODE,
      buildVideoPrefix({ type: VideoType.EPISODE, titleId, seasonId, episodeId: id }),
    );

    return toEpisodeView(deleted);
  }

  async getStreamUrl(id: string): Promise<{ url: string }> {
    const episode = await this.findOneDetailed(id);

    if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

    const { seasonId, titleId } = getEpisodeTitleAndSeasonId(episode);

    return this.mediaAssetService.getPlaybackUrl({
      type: VideoType.EPISODE,
      titleId,
      seasonId,
      episodeId: episode.id,
    });
  }
}
