import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { ImageKind, imageProfile } from "../queues/image-transcoder/image-profile.const";
import BucketType from "../s3/enums/bucket-type.enum";
import { buildRawKey } from "../s3/raw-key";
import { S3Service } from "../s3/s3.service";
import { ImageUploadInput, ImageUploadUrl } from "./image.types";
import { IMAGE_TARGETS } from "./utils/image-target.const";

const UPLOAD_URL_TTL_SECONDS = 120;

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {}

  async createUploadUrl(
    kind: ImageKind,
    ownerId: string,
    { contentType }: ImageUploadInput,
  ): Promise<ImageUploadUrl> {
    const profile = imageProfile(kind);

    if (!profile.allowedUploadTypes.includes(contentType)) {
      throw new BadRequestException(
        `An image must be one of ${profile.allowedUploadTypes.join(", ")}`,
      );
    }

    const rawKey = buildRawKey({
      kind: IMAGE_TARGETS[kind].rawKind,
      ownerId,
      name: randomUUID(),
    });

    const uploadUrl = await this.s3Service.getUploadPresignedUrl(
      rawKey,
      BucketType.RAW,
      UPLOAD_URL_TTL_SECONDS,
      contentType,
    );

    return { uploadUrl, rawKey, maxBytes: profile.maxUploadBytes };
  }

  buildProcessedKey(kind: ImageKind, ownerId: string, version: string): string {
    return IMAGE_TARGETS[kind].processedKey(ownerId, version);
  }

  async attachProcessed(kind: ImageKind, ownerId: string, newKey: string): Promise<void> {
    const target = IMAGE_TARGETS[kind];
    const previous = await target.read(this.prisma, ownerId);

    if (!previous) {
      await this.s3Service.deleteObject(newKey, BucketType.PROCESSED).catch(() => undefined);
      throw new NotFoundException(`${target.label} with id ${ownerId} not found`);
    }

    await target.write(this.prisma, ownerId, newKey);

    if (previous.key && previous.key !== newKey) {
      await this.deleteStoredImage(previous.key);
    }
  }

  async remove(kind: ImageKind, ownerId: string): Promise<void> {
    const target = IMAGE_TARGETS[kind];
    const stored = await target.read(this.prisma, ownerId);

    if (!stored?.key) return;

    await target.write(this.prisma, ownerId, null);
    await this.deleteStoredImage(stored.key);
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
