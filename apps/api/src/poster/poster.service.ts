import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { UploadUrlResponseDto } from "../common/dto/upload-url-response.dto";
import { imageProfile } from "../image-transcoder/image-profile.const";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { buildRawKey } from "../s3/raw-key";
import { S3Service } from "../s3/s3.service";
import { POSTER_TARGETS, PosterEntityKind } from "./utils/poster-target.const";

export type { PosterEntityKind };

const UPLOAD_URL_TTL_SECONDS = 120;

@Injectable()
export class PosterService {
  private readonly logger = new Logger(PosterService.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {}

  buildProcessedKey(kind: PosterEntityKind, ownerId: string, version: string): string {
    return `posters/${kind}/${ownerId}/${version}.webp`;
  }

  async createUploadUrl(kind: PosterEntityKind, id: string): Promise<UploadUrlResponseDto> {
    const target = POSTER_TARGETS[kind];

    const rawKey = buildRawKey({ kind: target.rawKind, ownerId: id, name: randomUUID() });

    const uploadUrl = await this.s3Service.getUploadPresignedUrl(
      rawKey,
      BucketType.RAW,
      UPLOAD_URL_TTL_SECONDS,
    );

    return { uploadUrl, rawKey, maxBytes: imageProfile(target.imageKind).maxUploadBytes };
  }

  async attachProcessed(kind: PosterEntityKind, ownerId: string, newKey: string): Promise<void> {
    const previous = await POSTER_TARGETS[kind].read(this.prisma, ownerId);

    if (!previous) {
      await this.s3Service.deleteObject(newKey, BucketType.PROCESSED).catch(() => undefined);
      throw new NotFoundException(`${POSTER_TARGETS[kind].label} with id ${ownerId} not found`);
    }

    await POSTER_TARGETS[kind].write(this.prisma, ownerId, newKey);

    if (previous.key && previous.key !== newKey) {
      await this.deleteStoredImage(previous.key);
    }
  }

  async removeStoredImage(kind: PosterEntityKind, ownerId: string): Promise<void> {
    const stored = await POSTER_TARGETS[kind].read(this.prisma, ownerId);
    await this.deleteStoredImage(stored?.key);
  }

  async deleteStoredImage(key: string | null | undefined): Promise<void> {
    if (!key) return;

    await this.s3Service
      .deleteObject(key, BucketType.PROCESSED)
      .catch((error: unknown) => this.logger.error(`Failed to remove image object ${key}`, error));
  }

  toPublicUrl(key: string | null | undefined): string | null {
    return key ? this.s3Service.getPublicUrl(key, BucketType.PROCESSED) : null;
  }
}
