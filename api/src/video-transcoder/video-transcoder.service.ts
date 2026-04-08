import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { TranscodingStatus } from "@prisma/client";
import { Queue } from "bullmq";
import * as ffmpeg from "fluent-ffmpeg";
import * as fs from "fs-extra";
import * as path from "path";
import { EpisodeService } from "src/episode/episode.service";
import { PrismaService } from "src/prisma/prisma.service";
import { S3Service } from "src/S3/S3.service";
import { TranscodeVideoDto } from "./dto/request/transcode-video.dto";
import { VideoType } from "./enums/video-type.enum";

@Injectable()
export class VideoTranscoderService {
  private readonly logger = new Logger();
  private readonly resolutionVariants = [
    { width: 2560, height: 1440, bitrate: "8000k", name: "1440p" },
    { width: 1920, height: 1080, bitrate: "5000k", name: "1080p" },
    { width: 1280, height: 720, bitrate: "2800k", name: "720p" },
    { width: 854, height: 480, bitrate: "1400k", name: "480p" },
  ];

  constructor(
    @InjectQueue("video-transcode") private readonly queue: Queue,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EpisodeService))
    private readonly episodeService: EpisodeService,
  ) {}

  async scheduleTranscodeVideo(payload: TranscodeVideoDto) {
    this.logger.log("Processing: ", payload);
    await this.queue.add("transcode-video", payload, {
      priority: 1,
      delay: 0,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: true,
    });
  }

  async transcodeVideo(id: string, inputPath: string, outputDir: string, type: VideoType) {
    const uploadTo = await this.uploadPath(id, type);
    await this.downloadRawVideo(id, inputPath);
    const metadata: ffmpeg.FfprobeData = await this.getMetadata(inputPath);
    const width: number = metadata.streams[0].width || 0;
    this.logger.log(`Starting HLS Transcoding for ${id}`);
    await this.runHlsTranscode(id, type, inputPath, outputDir, width);
    await this.uploadFilesToDb(uploadTo, outputDir);
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

      command
        .addOption("-var_stream_map", streamMap.join(" "))
        .output(path.join(outputDir, "%v/index.m3u8"))
        .on("start", (cmd) => this.logger.log("FFmpeg spawned with:", cmd))
        .on("progress", (progress) => {
          const now = Date.now();
          if (now - lastProgressUpdate > UPDATE_INTERVAL) {
            const percentage = Math.round(progress.percent || 0);
            this.updateProgress(id, type, percentage).catch((err: { message: string }) =>
              this.logger.error(`Failed to update progress: ${err.message}`),
            );
            lastProgressUpdate = now;
          }
        })
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
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
    const downloadStream = await this.s3Service.getRaw(key);
    const writeStream = fs.createWriteStream(writePath);
    return new Promise<void>((res, rej) => {
      downloadStream.pipe(writeStream).on("finish", res).on("error", rej);
    });
  }

  private async uploadFilesToDb(key: string, outputDir: string) {
    this.logger.log(`Uploading processed files to Object DB...`);
    const files = await fs.readdir(outputDir, { recursive: true });
    for (const file of files as string[]) {
      const localFilePath = path.join(outputDir, file);
      if ((await fs.stat(localFilePath)).isDirectory()) continue;

      const s3Key = `videos/${key}/${file}`;
      const contentType = file.endsWith(".m3u8") ? "application/x-mpegURL" : "video/MP2T";

      await this.s3Service.uploadProcessedStream(
        s3Key,
        fs.createReadStream(localFilePath),
        contentType,
      );
    }
  }

  private async uploadPath(id: string, type: VideoType): Promise<string> {
    if (type === VideoType.EPISODE) {
      const episode = await this.episodeService.findOneDetailed(id);

      if (!episode) throw new BadRequestException("Episode not found");

      const seasonId = episode.seasonId;
      const titleId = episode.season.titleId;
      return `${titleId}/${seasonId}/${episode.id}`;
    }

    return id;
  }

  async updateStatus(id: string, type: VideoType, status: TranscodingStatus) {
    this.logger.log(`Updating ${type} ${id} status to ${status}`);

    const data = { transcodingStatus: status };

    if (type === VideoType.EPISODE) {
      await Promise.all([
        this.prisma.episode.update({ where: { id }, data }),
        this.prisma.title.updateMany({
          where: { seasons: { some: { episodes: { some: { id } } } } },
          data,
        }),
      ]);
    } else if (type === VideoType.MOVIE) {
      await this.prisma.title.update({ where: { id }, data });
    }
  }

  async updateProgress(id: string, type: VideoType, progress: number) {
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
