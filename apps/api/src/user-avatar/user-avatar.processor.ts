import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { AVATAR_CONTENT_TYPE, AVATAR_MAX_UPLOAD_BYTES } from "./avatar-image.const";
import { AvatarImageConverter } from "./avatar-image.converter";
import { AVATAR_QUEUE_NAME, ProcessAvatarJob } from "./avatar-queue.options";
import { buildAvatarKey, UserAvatarService } from "./user-avatar.service";

@Processor(AVATAR_QUEUE_NAME, { concurrency: Number(process.env.AVATAR_CONCURRENCY) || 4 })
export class UserAvatarProcessor extends WorkerHost {
  private readonly logger = new Logger(UserAvatarProcessor.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly converter: AvatarImageConverter,
    private readonly userAvatarService: UserAvatarService,
  ) {
    super();
  }

  async process(job: Job<ProcessAvatarJob>): Promise<{ avatarKey: string }> {
    const { userId, rawKey } = job.data;
    const workDir = await mkdtemp(path.join(tmpdir(), "avatar-"));
    let uploadedKey: string | undefined;

    try {
      const originalPath = path.join(workDir, "original");
      const webpPath = path.join(workDir, "avatar.webp");

      await this.download(rawKey, originalPath);
      await this.assertWithinSizeLimit(originalPath, rawKey);
      await this.converter.assertDecodableImage(originalPath);
      await this.converter.toSquareWebp(originalPath, webpPath);

      // The job id is the raw key, which is unique per upload, so this version
      // is stable across retries — a retry overwrites rather than orphaning.
      const avatarKey = buildAvatarKey(userId, path.basename(rawKey));
      await this.s3Service.uploadStream(
        BucketType.PROCESSED,
        avatarKey,
        createReadStream(webpPath),
        AVATAR_CONTENT_TYPE,
      );
      uploadedKey = avatarKey;

      await this.userAvatarService.attachProcessedAvatar(userId, avatarKey);

      const [before, after] = await Promise.all([stat(originalPath), stat(webpPath)]);
      this.logger.log(
        `Avatar for ${userId}: ${before.size} → ${after.size} bytes (${Math.round((1 - after.size / before.size) * 100)}% smaller)`,
      );

      await this.discardOriginal(rawKey);
      return { avatarKey };
    } catch (error) {
      // The message must carry the error itself: nestjs-pino treats a second
      // positional argument as the stack *string*, so passing the Error object
      // there swallows it and the log ends at "failed:".
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Avatar job ${job.id} for ${userId} failed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Only once no retry is coming: deleting the original on every failure
      // would make every retry fail on the download instead of on the real
      // cause, turning a transient error into a permanent one. A retry reuses
      // the same processed key, so a leftover upload is overwritten rather
      // than orphaned — it is only the give-up path that has to clean up.
      if (this.isFinalAttempt(job)) {
        await this.discardOriginal(rawKey);
        // Uploaded but never attached: nothing will ever reference it.
        if (uploadedKey !== undefined) await this.discardUnattached(uploadedKey);
      }
      throw error;
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private isFinalAttempt(job: Job<ProcessAvatarJob>): boolean {
    // attemptsMade counts the attempt now failing, so it equals the configured
    // total on the last one. An unset `attempts` means BullMQ runs once.
    return job.attemptsMade >= (job.opts.attempts ?? 1);
  }

  /** The original has served its purpose; leaving it grows the raw bucket without bound. */
  private async discardOriginal(rawKey: string): Promise<void> {
    await this.s3Service
      .deleteObject(rawKey, BucketType.RAW)
      .catch((error: unknown) => this.logger.error(`Failed to delete raw avatar ${rawKey}`, error));
  }

  /** Processed object the user was never pointed at, after the job gave up. */
  private async discardUnattached(avatarKey: string): Promise<void> {
    await this.s3Service
      .deleteObject(avatarKey, BucketType.PROCESSED)
      .catch((error: unknown) =>
        this.logger.error(`Failed to delete unattached avatar ${avatarKey}`, error),
      );
  }

  private async download(key: string, destination: string): Promise<void> {
    const body = await this.s3Service.get(key, BucketType.RAW);
    await pipeline(body, createWriteStream(destination));
  }

  /**
   * Checked here rather than only at the presigned-URL step: a presigned PUT
   * carries no size limit, so the only place the real byte count is known is
   * after the object exists.
   */
  private async assertWithinSizeLimit(filePath: string, rawKey: string): Promise<void> {
    const { size } = await stat(filePath);
    if (size > AVATAR_MAX_UPLOAD_BYTES) {
      throw new Error(
        `Avatar ${rawKey} is ${size} bytes, over the ${AVATAR_MAX_UPLOAD_BYTES} limit`,
      );
    }
  }
}
