import { Injectable, Logger } from "@nestjs/common";
import { TranscodingStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { VideoTranscodingProgressResponseDto } from "./dto/response/video-transcoding-progress-response.dto";
import { VideoType } from "./enums/video-type.enum";
import { TranscodeAbortedError } from "./utils/transcode-aborted.error";

/**
 * Everything the pipeline records about a transcode in Postgres: the status on
 * the row being transcoded, the progress percentage, and whether the row is
 * still there at all.
 *
 * Exists-checking lives here because it is read from three places — before the
 * download, between stages, and from inside ffmpeg's progress handler — and
 * all three mean the same thing: the title or episode was deleted mid-job.
 */
@Injectable()
export class VideoTranscodeStateService {
  private readonly logger = new Logger(VideoTranscodeStateService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly existsCheckers: Record<VideoType, (id: string) => Promise<boolean>> = {
    [VideoType.EPISODE]: async (id) =>
      !!(await this.prisma.episode.findUnique({ where: { id }, select: { id: true } })),
    [VideoType.MOVIE]: async (id) =>
      !!(await this.prisma.title.findUnique({ where: { id }, select: { id: true } })),
  };

  async exists(id: string, type: VideoType): Promise<boolean> {
    return this.existsCheckers[type](id);
  }

  async ensureExists(id: string, type: VideoType): Promise<void> {
    if (!(await this.exists(id, type)))
      throw new TranscodeAbortedError(`Entity ${id} was deleted during transcoding`);
  }

  async updateStatus(id: string, type: VideoType, status: TranscodingStatus) {
    this.logger.log(`Updating ${type} ${id} status to ${status}`);

    const data = { transcodingStatus: status };

    if (type === VideoType.EPISODE) {
      const episode = await this.prisma.episode.findUnique({
        where: { id },
        select: { season: { select: { titleId: true } } },
      });

      if (!episode) return;

      await this.prisma.$transaction([
        this.prisma.episode.updateMany({ where: { id }, data }),
        this.prisma.title.updateMany({ where: { id: episode.season.titleId }, data }),
      ]);
    } else if (type === VideoType.MOVIE) {
      await this.prisma.title.updateMany({ where: { id }, data });
    }
  }

  async updateProgress(id: string, type: VideoType, progress: number) {
    if (!(await this.exists(id, type))) return;

    const where = type === VideoType.EPISODE ? { episodeId: id } : { titleId: id };

    await this.prisma.videoTranscodingProgress.upsert({
      where,
      update: { progressPercentage: progress },
      create: {
        ...where,
        progressPercentage: progress,
      },
    });
  }

  async getProgress(
    id: string,
    type: VideoType,
  ): Promise<VideoTranscodingProgressResponseDto | null> {
    const where = type === VideoType.EPISODE ? { episodeId: id } : { titleId: id };
    const progress = await this.prisma.videoTranscodingProgress.findUnique({ where });

    return progress ? new VideoTranscodingProgressResponseDto(progress) : null;
  }
}
