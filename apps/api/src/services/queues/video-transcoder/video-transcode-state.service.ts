import { Injectable } from "@nestjs/common";
import { TranscodingStatus } from "@prisma/client";
import { Logged } from "../../../decorators/logged.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { VideoType } from "./enums/video-type.enum";
import { TranscodeAbortedError } from "./utils/transcode-aborted.error";
import { toVideoTranscodingProgressView } from "./video-transcoder.mapper";
import { VideoTranscodingProgressView } from "./video-transcoder.types";

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
  constructor(private readonly prisma: PrismaService) {}

  private readonly existsCheckers: Record<VideoType, (id: string) => Promise<boolean>> = {
    [VideoType.EPISODE]: async (id) =>
      !!(await this.prisma.episode.findUnique({ where: { id }, select: { id: true } })),
    [VideoType.MOVIE]: async (id) =>
      !!(await this.prisma.title.findUnique({ where: { id }, select: { id: true } })),
  };

  @Logged({ completedLevel: "debug" })
  async exists(id: string, type: VideoType): Promise<boolean> {
    return this.existsCheckers[type](id);
  }

  @Logged({ completedLevel: "debug", failedLevel: "warn" })
  async ensureExists(id: string, type: VideoType): Promise<void> {
    if (!(await this.exists(id, type)))
      throw new TranscodeAbortedError(`Entity ${id} was deleted during transcoding`);
  }

  @Logged()
  async updateStatus(id: string, type: VideoType, status: TranscodingStatus) {
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

  @Logged({ completedLevel: "debug" })
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

  @Logged()
  async getProgress(id: string, type: VideoType): Promise<VideoTranscodingProgressView | null> {
    const where = type === VideoType.EPISODE ? { episodeId: id } : { titleId: id };
    const progress = await this.prisma.videoTranscodingProgress.findUnique({ where });

    return progress ? toVideoTranscodingProgressView(progress) : null;
  }
}
