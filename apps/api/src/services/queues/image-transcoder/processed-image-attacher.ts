import { ImageKind } from "./image-profile.const";

export interface ProcessedImageAttacher {
  readonly kind: ImageKind;

  buildKey(ownerId: string, version: string): string;

  attach(ownerId: string, key: string): Promise<void>;
}

export const IMAGE_ATTACHERS = Symbol("IMAGE_ATTACHERS");
