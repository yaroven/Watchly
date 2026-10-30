import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { TranscodingStatus } from "@prisma/client";
import { Job } from "bullmq";
import * as fs from "fs-extra";
import pMap from "p-map";
import * as path from "path";
import { Histogram } from "prom-client";
import { Readable } from "stream";
import { PrismaService } from "../../prisma/prisma.service";
import BucketType from "../../s3/enums/bucket-type.enum";
import { VIDEO_ROOT } from "../../s3/processed-key";
import { S3Service } from "../../s3/s3.service";
import logJobFailure from "../utils/log-job-failure.util";
import withWorkDir from "../utils/work-dir.util";
import { VideoType } from "./enums/video-type.enum";
import { HlsTranscoder } from "./hls-transcoder.service";
import resolveVideoPath from "./utils/resolve-video-path.util";
import { TranscodeAbortedError } from "./utils/transcode-aborted.error";
import { PROCESSED_UPLOAD_CONCURRENCY } from "./video-profile.const";
import { VIDEO_TRANSCODE_QUEUE_NAME } from "./video-transcode-queue.options";
import { VideoTranscodeStateService } from "./video-transcode-state.service";
import { TranscodeVideoJob } from "./video-transcoder.types";

const duration = new Histogram({
  name: "video_transcode_duration_seconds",
  help: "Time spent transcoding one video, by outcome",
  labelNames: ["kind", "outcome"],
  // Minutes to an hour. An image's buckets are two orders of magnitude lower,
  // which is why that is a metric of its own rather than a label on this one —
  // a histogram carries one bucket set for every series.
  buckets: [10, 30, 60, 300, 600, 1800, 3600],
});

@Processor(VIDEO_TRANSCODE_QUEUE_NAME, {
  concurrency: Number(process.env.VIDEO_TRANSCODE_CONCURRENCY) || 2,
})
@Injectable()
export class VideoTranscoderProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoTranscoderProcessor.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly hls: HlsTranscoder,
    private readonly state: VideoTranscodeStateService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<TranscodeVideoJob>) {
    const { type, id } = job.data;
    const jobId = job.id;
    const stop = duration.startTimer({ kind: VideoType[type].toLowerCase() });

    return withWorkDir(`transcode-${jobId}`, async (workDir) => {
      const inputPath = path.join(workDir, id);
      const outputDir = path.join(workDir, "output");

      try {
        await this.state.updateStatus(id, type, TranscodingStatus.PROCESSING);
        await this.state.updateProgress(id, type, 0);
        await fs.ensureDir(outputDir);
        await this.transcode(id, type, inputPath, outputDir);

        await this.state.updateStatus(id, type, TranscodingStatus.COMPLETED);
        await this.state.updateProgress(id, type, 100);
        this.logger.log(`Job ${jobId} finished successfully.`);
        stop({ outcome: "success" });
        return { result: "success" };
      } catch (error) {
        if (error instanceof TranscodeAbortedError) {
          this.logger.warn(`Job ${jobId} aborted: ${error.message}`);
          stop({ outcome: "aborted" });
          return { result: "aborted" };
        }

        await this.state.updateStatus(id, type, TranscodingStatus.FAILED);
        logJobFailure(this.logger, `Job ${jobId}`, error);
        stop({ outcome: "failed" });
        throw error;
      }
    });
  }

  private async transcode(id: string, type: VideoType, inputPath: string, outputDir: string) {
    await this.state.ensureExists(id, type);
    const uploadTo = await resolveVideoPath(this.prisma, id, type);
    await this.download(id, inputPath);
    await this.state.ensureExists(id, type);

    const sourceWidth = await this.hls.probeWidth(inputPath);

    this.logger.log(`Starting HLS Transcoding for ${id}`);
    await this.hls.run({
      input: inputPath,
      outputDir,
      sourceWidth,
      onProgress: (percent) =>
        void this.state
          .updateProgress(id, type, percent)
          .catch((err: unknown) =>
            this.logger.error(
              `Failed to update progress: ${err instanceof Error ? err.message : String(err)}`,
            ),
          ),
      shouldAbort: async () => !(await this.state.exists(id, type)),
    });

    await this.upload(id, type, uploadTo, outputDir);
  }

  private async download(key: string, writePath: string) {
    this.logger.log(`Downloading ${key} to ${writePath}`);
    let downloadStream: Readable;
    try {
      downloadStream = await this.s3Service.get(key, BucketType.RAW);
    } catch (error) {
      if (
        !(await this.state.exists(key, VideoType.MOVIE)) &&
        !(await this.state.exists(key, VideoType.EPISODE))
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

  private async upload(id: string, type: VideoType, key: string, outputDir: string) {
    await this.state.ensureExists(id, type);
    this.logger.log(`Uploading processed files to Object DB...`);
    const files = (await fs.readdir(outputDir, { recursive: true })) as string[];

    await pMap(
      files,
      async (file) => {
        const localFilePath = path.join(outputDir, file);
        if ((await fs.stat(localFilePath)).isDirectory()) return;

        const s3Key = `${VIDEO_ROOT}/${key}/${file}`;
        const contentType = file.endsWith(".m3u8") ? "application/x-mpegURL" : "video/MP2T";

        await this.s3Service.uploadStream(
          BucketType.PROCESSED,
          s3Key,
          fs.createReadStream(localFilePath),
          contentType,
        );
      },
      { concurrency: PROCESSED_UPLOAD_CONCURRENCY },
    );

    if (!(await this.state.exists(id, type)))
      throw new TranscodeAbortedError(`Entity ${id} was deleted before processed upload finished`);
  }
}
