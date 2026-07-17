import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Episode, Prisma } from "@prisma/client";
import { settleAllOrLog } from "../common/settle-all-or-throw.util";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { CreateEpisodeDto } from "./dto/request/create-episode.dto";
import { UpdateEpisodeDto } from "./dto/request/update-episode.dto";
import { getEpisodeTitleAndSeasonId } from "./episode-path.util";

@Injectable()
export class EpisodeService {
  private readonly logger = new Logger(EpisodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoTranscoderService: VideoTranscoderService,
    private readonly s3Service: S3Service,
  ) {}

  async create(data: CreateEpisodeDto): Promise<Episode> {
    try {
      return await this.prisma.episode.create({ data });
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

  async findAll(seasonId?: string): Promise<Episode[]> {
    const where = seasonId ? { seasonId } : {};
    return this.prisma.episode.findMany({
      where,
      orderBy: { number: "asc" },
    });
  }

  async findOneDetailed(id: string) {
    return this.prisma.episode.findUnique({
      where: { id },
      include: { season: { include: { title: true } } },
    });
  }

  async findOne(id: string): Promise<Episode | null> {
    return this.prisma.episode.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateEpisodeDto): Promise<Episode> {
    if (data.number) {
      const episode = await this.findOne(id);
      if (!episode) throw new BadRequestException(`Episode with id ${id} not found`);

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
    }

    try {
      return await this.prisma.episode.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(
          `Episode with number ${data.number} already exists in this season`,
        );
      }
      throw error;
    }
  }

  async delete(id: string): Promise<Episode> {
    const episode = await this.findOneDetailed(id);
    if (!episode) throw new BadRequestException(`Episode with id ${id} not found`);

    const { seasonId, titleId } = getEpisodeTitleAndSeasonId(episode);

    const deleted = await this.prisma.episode.delete({ where: { id } });

    await settleAllOrLog(
      [
        {
          id: "scheduled-transcodes",
          run: () => this.videoTranscoderService.cancelScheduledTranscodes(id, VideoType.EPISODE),
        },
        { id: "raw-video", run: () => this.s3Service.deleteObject(id, BucketType.RAW) },
        {
          id: "processed-folder",
          run: () =>
            this.s3Service.deleteFolder(
              `videos/${titleId}/${seasonId}/${id}/`,
              BucketType.PROCESSED,
            ),
        },
      ],
      (task) => task.run(),
      (task) => task.id,
      this.logger,
      { itemLabel: "asset", parentLabel: "episode", parentId: id },
    );

    return deleted;
  }

  async transcode(id: string): Promise<void> {
    const episode = await this.findOne(id);

    if (!episode) throw new BadRequestException(`Episode with id ${id} not found`);

    await this.videoTranscoderService.scheduleTranscodeVideo({
      id,
      type: VideoType.EPISODE,
    });
  }

  async getUploadUrl(id: string): Promise<{ url: string }> {
    const episode = await this.findOne(id);

    if (!episode) throw new BadRequestException(`Episode with id ${id} not found`);

    const url = await this.s3Service.getUploadPresignedUrl(id, BucketType.RAW);
    return { url };
  }

  async getStreamUrl(id: string): Promise<{ url: string }> {
    const episode = await this.findOneDetailed(id);

    if (!episode) throw new BadRequestException(`Episode with id ${id} not found`);

    const { seasonId, titleId } = getEpisodeTitleAndSeasonId(episode);

    const url = await this.s3Service.getReadPresignedUrl(
      `videos/${titleId}/${seasonId}/${episode.id}/master.m3u8`,
      BucketType.PROCESSED,
    );

    return { url };
  }
}
