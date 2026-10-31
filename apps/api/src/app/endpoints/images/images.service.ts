import { Injectable } from "@nestjs/common";
import { Logged } from "../../../decorators/logged.decorator";
import { ImageKind } from "../../../services/image/enums/image-kind.enum";
import { ImageService } from "../../../services/image/image.service";
import { ImageUploadInput, ImageUploadUrl } from "../../../services/image/image.types";
import { ImageTranscodeScheduler } from "../../../services/queues/image-transcoder/image-transcode-scheduler.service";

@Injectable()
export class ImagesService {
  constructor(
    private readonly imageService: ImageService,
    private readonly scheduler: ImageTranscodeScheduler,
  ) {}

  @Logged()
  async createUploadUrl(
    kind: ImageKind,
    ownerId: string,
    input: ImageUploadInput,
  ): Promise<ImageUploadUrl> {
    return this.imageService.createUploadUrl(kind, ownerId, input);
  }

  @Logged()
  async completeUpload(kind: ImageKind, ownerId: string, rawKey: string): Promise<void> {
    await this.imageService.assertUploaded(kind, ownerId, rawKey);
    await this.scheduler.schedule({ kind, ownerId, rawKey });
  }

  @Logged()
  async remove(kind: ImageKind, ownerId: string): Promise<void> {
    await this.imageService.remove(kind, ownerId);
  }
}
