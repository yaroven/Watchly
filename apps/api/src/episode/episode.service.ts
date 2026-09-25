import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../common/pagination/prisma-query.util";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { MultipartUploadPart } from "../s3/multipart.constants";
import { S3Service } from "../s3/s3.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { CreateEpisodeDto } from "./dto/request/create-episode.dto";
import { UpdateEpisodeDto } from "./dto/request/update-episode.dto";
import { EpisodeResponseDto } from "./dto/response/episode-response.dto";
import { getEpisodeTitleAndSeasonId } from "./episode-path.util";

@Injectable()
export class EpisodeService {
  private readonly logger = new Logger(EpisodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoTranscoderService: VideoTranscoderService,
    private readonly s3Service: S3Service,
  ) {}

  async create(data: CreateEpisodeDto): Promise<EpisodeResponseDto> {
    try {
      const episode = await this.prisma.episode.create({ data });
      return new EpisodeResponseDto(episode);
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

  async findAll(filters: Filter[] = [], sort?: Sorting): Promise<EpisodeResponseDto[]> {
    const where = buildWhere(filters) as Prisma.EpisodeWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      number: "asc",
    }) as Prisma.EpisodeOrderByWithRelationInput;

    const episodes = await this.prisma.episode.findMany({ where, orderBy });
    return episodes.map((episode) => new EpisodeResponseDto(episode));
  }

  async findOneDetailed(id: string) {
    return this.prisma.episode.findUnique({
      where: { id },
      include: { season: { include: { title: true } } },
    });
  }

  async findOne(id: string): Promise<EpisodeResponseDto | null> {
    const episode = await this.prisma.episode.findUnique({ where: { id } });
    return episode ? new EpisodeResponseDto(episode) : null;
  }

  async update(id: string, data: UpdateEpisodeDto): Promise<EpisodeResponseDto> {
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

    try {
      const updated = await this.prisma.episode.update({ where: { id }, data });
      return new EpisodeResponseDto(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(
          `Episode with number ${data.number} already exists in this season`,
        );
      }
      throw error;
    }
  }

  async delete(id: string): Promise<EpisodeResponseDto> {
    const episode = await this.findOneDetailed(id);
    if (!episode) throw new BadRequestException(`Episode with id ${id} not found`);

    const { seasonId, titleId } = getEpisodeTitleAndSeasonId(episode);

    const deleted = await this.prisma.episode.delete({ where: { id } });

    await this.videoTranscoderService.cleanupVideoAsset(
      id,
      VideoType.EPISODE,
      `videos/${titleId}/${seasonId}/${id}/`,
    );

    return new EpisodeResponseDto(deleted);
  }

  async transcode(id: string): Promise<void> {
    const episode = await this.findOne(id);

    if (!episode) throw new BadRequestException(`Episode with id ${id} not found`);

    await this.videoTranscoderService.scheduleTranscodeVideo({
      id,
      type: VideoType.EPISODE,
    });
  }

  async startUpload(id: string, fileSize: number) {
    const episode = await this.findOne(id);
    if (!episode) throw new BadRequestException(`Episode with id ${id} not found`);

    return this.s3Service.startMultipartUpload(id, BucketType.RAW, fileSize);
  }

  async completeUpload(id: string, uploadId: string, parts: MultipartUploadPart[]): Promise<void> {
    const episode = await this.findOne(id);
    if (!episode) throw new BadRequestException(`Episode with id ${id} not found`);

    await this.s3Service.completeMultipartUpload(id, BucketType.RAW, uploadId, parts);
  }

  async abortUpload(id: string, uploadId: string): Promise<void> {
    await this.s3Service.abortMultipartUpload(id, BucketType.RAW, uploadId);
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
