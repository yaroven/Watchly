import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { randomUUID } from "node:crypto";
import { S3Config, S3ConfigName } from "../config/s3.config";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { buildRawKey, RawObjectKind } from "../s3/raw-key";
import { S3Service } from "../s3/s3.service";
import { AVATAR_ALLOWED_UPLOAD_TYPES, AVATAR_MAX_UPLOAD_BYTES } from "./avatar-image.const";
import { AVATAR_JOB_NAME, AVATAR_QUEUE_NAME, ProcessAvatarJob } from "./avatar-queue.options";
import { AvatarUploadUrlDto } from "./dto/response/avatar-upload-url.dto";

const UPLOAD_URL_TTL_SECONDS = 120;

/** One avatar per user, so the processed object is addressed by the user id. */
export function buildAvatarKey(userId: string, version: string): string {
  return `avatars/${userId}/${version}.webp`;
}

@Injectable()
export class UserAvatarService {
  private readonly logger = new Logger(UserAvatarService.name);
  private readonly config: S3Config;

  constructor(
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
    configService: ConfigService,
    @InjectQueue(AVATAR_QUEUE_NAME) private readonly queue: Queue<ProcessAvatarJob>,
  ) {
    this.config = configService.getOrThrow<S3Config>(S3ConfigName);
  }

  /**
   * The browser uploads straight to the raw bucket; the API never sees the
   * bytes. Compression happens in the worker, which is the only image that
   * carries ffmpeg.
   */
  async createUploadUrl(userId: string, contentType: string): Promise<AvatarUploadUrlDto> {
    if (
      !AVATAR_ALLOWED_UPLOAD_TYPES.includes(
        contentType as (typeof AVATAR_ALLOWED_UPLOAD_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Avatar must be one of ${AVATAR_ALLOWED_UPLOAD_TYPES.join(", ")}`,
      );
    }

    // A fresh name per upload: the raw object is deleted once processed, and two
    // uploads racing each other must not land on the same key.
    const rawKey = buildRawKey({
      kind: RawObjectKind.USER_AVATAR,
      ownerId: userId,
      name: randomUUID(),
    });

    const uploadUrl = await this.s3Service.getUploadPresignedUrl(
      rawKey,
      BucketType.RAW,
      UPLOAD_URL_TTL_SECONDS,
    );

    return new AvatarUploadUrlDto({ uploadUrl, rawKey, maxBytes: AVATAR_MAX_UPLOAD_BYTES });
  }

  /** Called from the S3 event path once the upload actually lands. */
  async scheduleProcessing(job: ProcessAvatarJob): Promise<void> {
    await this.queue.add(AVATAR_JOB_NAME, job, {
      // One job per uploaded object, so a redelivered SQS message does not
      // process the same bytes twice.
      jobId: `avatar-${job.rawKey}`,
    });
  }

  /**
   * Replaces the stored avatar and removes the one it supersedes.
   *
   * The key carries a version precisely so the URL changes: the processed
   * bucket is served with long-lived caching, and a stable key would leave the
   * old image in front of the viewer.
   */
  async attachProcessedAvatar(userId: string, newKey: string): Promise<void> {
    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true },
    });

    if (!previous) {
      // The account went away mid-flight; the object has no owner to belong to.
      await this.s3Service.deleteObject(newKey, BucketType.PROCESSED).catch(() => undefined);
      throw new BadRequestException(`User with id ${userId} not found`);
    }

    await this.prisma.user.update({ where: { id: userId }, data: { avatarKey: newKey } });

    if (previous.avatarKey && previous.avatarKey !== newKey) {
      await this.s3Service
        .deleteObject(previous.avatarKey, BucketType.PROCESSED)
        .catch((error: unknown) =>
          this.logger.error(`Failed to remove the superseded avatar ${previous.avatarKey}`, error),
        );
    }
  }

  async remove(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true },
    });

    if (!user?.avatarKey) return;

    await this.prisma.user.update({ where: { id: userId }, data: { avatarKey: null } });
    await this.s3Service
      .deleteObject(user.avatarKey, BucketType.PROCESSED)
      .catch((error: unknown) =>
        this.logger.error(`Failed to remove avatar object ${user.avatarKey}`, error),
      );
  }

  /**
   * A plain public URL, not presigned: the processed bucket is readable and a
   * signature in a stored value expires while the row keeps claiming it works.
   */
  buildPublicUrl(avatarKey: string | null): string | null {
    if (!avatarKey) return null;
    return `${this.config.publicEndpoint.replace(/\/$/, "")}/${this.config.processedBucketName}/${avatarKey}`;
  }
}
