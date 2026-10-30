import { Provider } from "@nestjs/common";
import { ImageKind } from "../queues/image-transcoder/image-profile.const";
import { ProcessedImageAttacher } from "../queues/image-transcoder/processed-image-attacher";
import { PosterService } from "./poster.service";
import { POSTER_ENTITY_KINDS, POSTER_TARGETS, PosterEntityKind } from "./utils/poster-target.const";

export class PosterImageAttacher implements ProcessedImageAttacher {
  readonly kind: ImageKind;

  constructor(
    private readonly posterService: PosterService,
    private readonly entityKind: PosterEntityKind,
  ) {
    this.kind = POSTER_TARGETS[entityKind].imageKind;
  }

  buildKey(ownerId: string, version: string): string {
    return this.posterService.buildProcessedKey(this.entityKind, ownerId, version);
  }

  async attach(ownerId: string, key: string): Promise<void> {
    await this.posterService.attachProcessed(this.entityKind, ownerId, key);
  }
}

export const POSTER_IMAGE_ATTACHERS = Symbol("POSTER_IMAGE_ATTACHERS");

export const posterImageAttachersProvider: Provider = {
  provide: POSTER_IMAGE_ATTACHERS,
  inject: [PosterService],
  useFactory: (posterService: PosterService): ProcessedImageAttacher[] =>
    POSTER_ENTITY_KINDS.map((kind) => new PosterImageAttacher(posterService, kind)),
};
