import { BadRequestException, Injectable } from "@nestjs/common";
import { Episode } from "@prisma/client";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly videoTranscoderService: VideoTranscoderService,
    private readonly s3Service: S3Service,
  ) {}

  async create(data: CreateEpisodeDto): Promise<Episode> {
    const existingEpisode = await this.prisma.episode.findFirst({
      where: {
        seasonId: data.seasonId,
        number: data.number,
      },
    });

    if (existingEpisode)
      throw new BadRequestException(
        `Episode with number ${data.number} already exists in this season`,
      );

    return this.prisma.episode.create({ data });
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

    return this.prisma.episode.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Episode> {
    const episode = await this.findOneDetailed(id);
    if (!episode) throw new BadRequestException(`Episode with id ${id} not found`);

    const { seasonId, titleId } = getEpisodeTitleAndSeasonId(episode);

    await this.videoTranscoderService.cancelScheduledTranscodes(id, VideoType.EPISODE);

    await this.s3Service.deleteObject(id, BucketType.RAW);
    await this.s3Service.deleteFolder(`videos/${titleId}/${seasonId}/${id}/`, BucketType.PROCESSED);

    return this.prisma.episode.delete({ where: { id } });
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
