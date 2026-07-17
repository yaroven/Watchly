import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { TranscodingStatus } from "@prisma/client";
import { Queue } from "bullmq";
import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs-extra";
import * as path from "path";
import { Readable } from "stream";

import { mapWithConcurrencyLimit } from "../common/concurrency.util";
import { getEpisodeTitleAndSeasonId } from "../episode/episode-path.util";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { TranscodeVideoDto } from "./dto/request/transcode-video.dto";
import { VideoType } from "./enums/video-type.enum";
import { VIDEO_TRANSCODE_QUEUE_NAME } from "./video-transcode-queue.options";

export class TranscodeAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscodeAbortedError";
  }
}

@Injectable()
export class VideoTranscoderService {
  private readonly logger = new Logger(VideoTranscoderService.name);
  private readonly resolutionVariants = [
    { width: 2560, height: 1440, bitrate: "8000k", name: "1440p" },
    { width: 1920, height: 1080, bitrate: "5000k", name: "1080p" },
    { width: 1280, height: 720, bitrate: "2800k", name: "720p" },
    { width: 854, height: 480, bitrate: "1400k", name: "480p" },
  ];

  constructor(
    @InjectQueue(VIDEO_TRANSCODE_QUEUE_NAME) private readonly queue: Queue,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {}

  private jobId(payload: TranscodeVideoDto): string {
    return `transcode-${payload.type}-${payload.id}`;
  }

  async scheduleTranscodeVideo(payload: TranscodeVideoDto) {
    this.logger.log("Processing: ", payload);
    await this.queue.add("transcode-video", payload, {
      jobId: this.jobId(payload),
    });
  }

  async cancelScheduledTranscodes(id: string, type: VideoType) {
    const cancellableStates = ["waiting", "delayed", "prioritized", "waiting-children"];
    const job = await this.queue.getJob(this.jobId({ id, type }));
    if (!job) return;

    const state = await job.getState();
    if (cancellableStates.includes(state)) {
      await job.remove();
    }
  }

  async transcodeVideo(id: string, inputPath: string, outputDir: string, type: VideoType) {
    await this.ensureEntityExists(id, type);
    const uploadTo = await this.uploadPath(id, type);
    await this.downloadRawVideo(id, inputPath);
    await this.ensureEntityExists(id, type);
    const metadata: ffmpeg.FfprobeData = await this.getMetadata(inputPath);
    const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");
    const width: number = videoStream?.width || 0;
    this.logger.log(`Starting HLS Transcoding for ${id}`);
    await this.runHlsTranscode(id, type, inputPath, outputDir, width);
    await this.uploadFilesToDb(id, type, uploadTo, outputDir);
  }

  private async runHlsTranscode(
    id: string,
    type: VideoType,
    input: string,
    outputDir: string,
    sourceWidth: number,
  ): Promise<void> {
    let lastProgressUpdate = 0;
    const UPDATE_INTERVAL = 2000;

    return new Promise((resolve, reject) => {
      const command = ffmpeg(input);

      const activeVariants = this.resolutionVariants.filter((v) => v.width <= sourceWidth);

      if (activeVariants.length === 0)
        activeVariants.push(this.resolutionVariants[this.resolutionVariants.length - 1]);

      command
        .format("hls")
        .addOption("-hls_time", "6")
        .addOption("-hls_playlist_type", "vod")
        .addOption("-master_pl_name", "master.m3u8");

      const streamMap: string[] = [];
      activeVariants.forEach((variant, index) => {
        const resString = `${variant.width}x${variant.height}`;
        this.addHlsVariant(command, index, resString, variant.bitrate);
        streamMap.push(`v:${index},a:${index}`);
      });

      let killedForAbort = false;

      command
        .addOption("-var_stream_map", streamMap.join(" "))
        .output(path.join(outputDir, "%v/index.m3u8"))
        .on("start", (cmd) => this.logger.log("FFmpeg spawned with:", cmd))
        .on("progress", (progress) => {
          const now = Date.now();
          if (now - lastProgressUpdate > UPDATE_INTERVAL) {
            const percentage = Math.round(progress.percent || 0);
            this.updateProgress(id, type, percentage).catch((err: unknown) =>
              this.logger.error(
                `Failed to update progress: ${err instanceof Error ? err.message : String(err)}`,
              ),
            );
            this.entityExists(id, type)
              .then((exists) => {
                if (!exists) {
                  killedForAbort = true;
                  command.kill("SIGKILL");
                }
              })
              .catch((err: unknown) =>
                this.logger.error(
                  `Failed to check entity existence during transcoding: ${err instanceof Error ? err.message : String(err)}`,
                ),
              );
            lastProgressUpdate = now;
          }
        })
        .on("end", () => resolve())
        .on("error", (err) => {
          if (killedForAbort) {
            reject(new TranscodeAbortedError(`Entity ${id} was deleted during transcoding`));
          } else {
            reject(err);
          }
        })
        .run();
    });
  }

  private addHlsVariant(cmd: ffmpeg.FfmpegCommand, index: number, res: string, bitrate: string) {
    cmd.outputOptions([`-map 0:v`, `-map 0:a`, `-s:v:${index}`, res, `-b:v:${index}`, bitrate]);
  }

  private async getMetadata(filePath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((res, rej) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) return rej(err instanceof Error ? err : new Error(String(err)));
        res(data);
      });
    });
  }

  private async downloadRawVideo(key: string, writePath: string) {
    this.logger.log(`Downloading ${key} to ${writePath}`);
    let downloadStream: Readable;
    try {
      downloadStream = await this.s3Service.get(key, BucketType.RAW);
    } catch (error) {
      if (
        !(await this.entityExists(key, VideoType.MOVIE)) &&
        !(await this.entityExists(key, VideoType.EPISODE))
      )
        throw new TranscodeAbortedError(`Source entity ${key} was deleted during transcoding`);

      throw error;
    }

    const writeStream = fs.createWriteStream(writePath);
    return new Promise<void>((res, rej) => {
      downloadStream.on("error", rej);
      writeStream.on("error", rej);
      writeStream.on("finish", res);
      downloadStream.pipe(writeStream);
    });
  }

  private async uploadFilesToDb(id: string, type: VideoType, key: string, outputDir: string) {
    await this.ensureEntityExists(id, type);
    this.logger.log(`Uploading processed files to Object DB...`);
    const files = (await fs.readdir(outputDir, { recursive: true })) as string[];

    await mapWithConcurrencyLimit(files, 8, async (file) => {
      const localFilePath = path.join(outputDir, file);
      if ((await fs.stat(localFilePath)).isDirectory()) return;

      const s3Key = `videos/${key}/${file}`;
      const contentType = file.endsWith(".m3u8") ? "application/x-mpegURL" : "video/MP2T";

      await this.s3Service.uploadStream(
        BucketType.PROCESSED,
        s3Key,
        fs.createReadStream(localFilePath),
        contentType,
      );
    });

    if (!(await this.entityExists(id, type)))
      throw new TranscodeAbortedError(`Entity ${id} was deleted before processed upload finished`);
  }

  private async uploadPath(id: string, type: VideoType): Promise<string> {
    if (type === VideoType.EPISODE) {
      const episode = await this.prisma.episode.findUnique({
        where: { id },
        include: { season: true },
      });

      if (!episode) throw new BadRequestException("Episode not found");

      const { seasonId, titleId } = getEpisodeTitleAndSeasonId(episode);
      return `${titleId}/${seasonId}/${episode.id}`;
    }

    return id;
  }

  private readonly entityExistsCheckers: Record<VideoType, (id: string) => Promise<boolean>> = {
    [VideoType.EPISODE]: async (id) =>
      !!(await this.prisma.episode.findUnique({ where: { id }, select: { id: true } })),
    [VideoType.MOVIE]: async (id) =>
      !!(await this.prisma.title.findUnique({ where: { id }, select: { id: true } })),
  };

  private async entityExists(id: string, type: VideoType): Promise<boolean> {
    return this.entityExistsCheckers[type](id);
  }

  private async ensureEntityExists(id: string, type: VideoType) {
    if (!(await this.entityExists(id, type)))
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
    if (!(await this.entityExists(id, type))) return;

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

  async getProgress(id: string, type: VideoType) {
    const where = type === VideoType.EPISODE ? { episodeId: id } : { titleId: id };
    return this.prisma.videoTranscodingProgress.findUnique({
      where,
    });
  }
}
