import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { S3Config, S3ConfigName } from "../config/s3.config";
import { ImageKind, imageProfile } from "../image-transcoder/image-profile.const";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { buildRawKey, RawObjectKind } from "../s3/raw-key";
import { S3Service } from "../s3/s3.service";
import { AvatarUploadUrlDto } from "./dto/response/avatar-upload-url.dto";

const UPLOAD_URL_TTL_SECONDS = 120;
const AVATAR_PROFILE = imageProfile(ImageKind.USER_AVATAR);

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
  ) {
    this.config = configService.getOrThrow<S3Config>(S3ConfigName);
  }

  async createUploadUrl(userId: string, contentType: string): Promise<AvatarUploadUrlDto> {
    if (!AVATAR_PROFILE.allowedUploadTypes.includes(contentType)) {
      throw new BadRequestException(
        `Avatar must be one of ${AVATAR_PROFILE.allowedUploadTypes.join(", ")}`,
      );
    }

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

    return new AvatarUploadUrlDto({
      uploadUrl,
      rawKey,
      maxBytes: AVATAR_PROFILE.maxUploadBytes,
    });
  }

  async attachProcessedAvatar(userId: string, newKey: string): Promise<void> {
    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true },
    });

    if (!previous) {
      await this.s3Service.deleteObject(newKey, BucketType.PROCESSED).catch(() => undefined);
      throw new NotFoundException(`User with id ${userId} not found`);
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

  buildPublicUrl(avatarKey: string | null): string | null {
    if (!avatarKey) return null;
    return `${this.config.publicEndpoint.replace(/\/$/, "")}/${this.config.processedBucketName}/${avatarKey}`;
  }
}
