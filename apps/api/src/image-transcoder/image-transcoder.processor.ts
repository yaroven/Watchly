import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Histogram, Registry } from "prom-client";
import logJobFailure from "../common/utils/log-job-failure.util";
import streamToFile from "../common/utils/stream-to-file.util";
import withWorkDir from "../common/utils/work-dir.util";
import { METRICS_REGISTRY } from "../metrics/metrics.const";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { imageProfile } from "./image-profile.const";
import { IMAGE_TRANSCODE_QUEUE_NAME, TranscodeImageJob } from "./image-transcode-queue.options";
import { ImageTranscoderService } from "./image-transcoder.service";
import { IMAGE_ATTACHERS, ProcessedImageAttacher } from "./processed-image-attacher";

@Processor(IMAGE_TRANSCODE_QUEUE_NAME, {
  concurrency: Number(process.env.IMAGE_TRANSCODE_CONCURRENCY) || 4,
})
export class ImageTranscoderProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageTranscoderProcessor.name);
  private readonly attachers: Map<string, ProcessedImageAttacher>;
  private readonly duration: Histogram<"kind" | "outcome">;
  private readonly sizeRatio: Histogram<"kind">;

  constructor(
    private readonly s3Service: S3Service,
    private readonly transcoder: ImageTranscoderService,
    @Inject(IMAGE_ATTACHERS) attachers: ProcessedImageAttacher[],
    @Inject(METRICS_REGISTRY) registry: Registry,
  ) {
    super();
    this.attachers = new Map(attachers.map((attacher) => [attacher.kind, attacher]));

    this.duration = new Histogram({
      name: "image_transcode_duration_seconds",
      help: "Time spent converting one image, by outcome",
      labelNames: ["kind", "outcome"],
      // Interactive: an avatar that takes ten seconds is already a problem.
      buckets: [0.25, 0.5, 1, 2.5, 5, 10, 30],
      registers: [registry],
    });

    this.sizeRatio = new Histogram({
      name: "image_size_ratio",
      help: "Converted size over original size; lower is a better conversion",
      labelNames: ["kind"],
      buckets: [0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1],
      registers: [registry],
    });
  }

  async process(job: Job<TranscodeImageJob>): Promise<{ key: string }> {
    return withWorkDir(`image-${job.data.kind}`, (workDir) => this.convert(job, workDir));
  }

  private async convert(job: Job<TranscodeImageJob>, workDir: string): Promise<{ key: string }> {
    const { kind, ownerId, rawKey } = job.data;
    const profile = imageProfile(kind);
    const attacher = this.attachers.get(kind);
    const stop = this.duration.startTimer({ kind });

    if (!attacher) {
      stop({ outcome: "failed" });
      throw new Error(`No attacher registered for image kind ${kind}`);
    }

    let uploadedKey: string | undefined;

    try {
      const originalPath = path.join(workDir, "original");
      const convertedPath = path.join(workDir, `converted.${profile.format}`);

      await streamToFile(await this.s3Service.get(rawKey, BucketType.RAW), originalPath);
      await this.transcoder.assertWithinSizeLimit(originalPath, rawKey, profile);
      await this.transcoder.assertDecodable(originalPath);
      await this.transcoder.convert(originalPath, convertedPath, profile);

      const key = attacher.buildKey(ownerId, path.basename(rawKey));
      await this.s3Service.uploadStream(
        BucketType.PROCESSED,
        key,
        createReadStream(convertedPath),
        profile.contentType,
      );
      uploadedKey = key;

      await attacher.attach(ownerId, key);

      const [before, after] = await Promise.all([stat(originalPath), stat(convertedPath)]);
      if (before.size > 0) this.sizeRatio.observe({ kind }, after.size / before.size);
      this.logger.log(
        `${kind} for ${ownerId}: ${before.size} → ${after.size} bytes (${Math.round((1 - after.size / before.size) * 100)}% smaller)`,
      );

      await this.discard(rawKey, BucketType.RAW);
      stop({ outcome: "success" });
      return { key };
    } catch (error) {
      stop({ outcome: "failed" });
      logJobFailure(this.logger, `Image job ${job.id} (${kind} for ${ownerId})`, error);

      if (this.isFinalAttempt(job)) {
        await this.discard(rawKey, BucketType.RAW);
        if (uploadedKey !== undefined) await this.discard(uploadedKey, BucketType.PROCESSED);
      }
      throw error;
    }
  }

  private isFinalAttempt(job: Job<TranscodeImageJob>): boolean {
    return job.attemptsMade >= (job.opts.attempts ?? 1);
  }

  private async discard(key: string, bucket: BucketType): Promise<void> {
    await this.s3Service
      .deleteObject(key, bucket)
      .catch((error: unknown) => this.logger.error(`Failed to delete ${key}`, error));
  }
}
