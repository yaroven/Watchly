import { Provider } from "@nestjs/common";
import { ImageKind } from "../queues/image-transcoder/image-profile.const";
import {
  IMAGE_ATTACHERS,
  ProcessedImageAttacher,
} from "../queues/image-transcoder/processed-image-attacher";
import { ImageService } from "./image.service";

export class ImageAttacher implements ProcessedImageAttacher {
  constructor(
    private readonly images: ImageService,
    readonly kind: ImageKind,
  ) {}

  buildKey(ownerId: string, version: string): string {
    return this.images.buildProcessedKey(this.kind, ownerId, version);
  }

  async attach(ownerId: string, key: string): Promise<void> {
    await this.images.attachProcessed(this.kind, ownerId, key);
  }
}

export const imageAttachersProvider: Provider = {
  provide: IMAGE_ATTACHERS,
  inject: [ImageService],
  useFactory: (images: ImageService): ProcessedImageAttacher[] =>
    Object.values(ImageKind).map((kind) => new ImageAttacher(images, kind)),
};
