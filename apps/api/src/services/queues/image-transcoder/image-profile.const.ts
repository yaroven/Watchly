export enum ImageKind {
  USER_AVATAR = "USER_AVATAR",
  TITLE_POSTER = "TITLE_POSTER",
  SEASON_POSTER = "SEASON_POSTER",
  ARTIST_PHOTO = "ARTIST_PHOTO",
}

export interface ImageProfile {
  width: number;
  height: number;
  format: "webp";
  quality: number;
  contentType: string;
  maxUploadBytes: number;
  allowedUploadTypes: readonly string[];
}

export const IMAGE_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const POSTER_ASPECT = { width: 600, height: 900 } as const;

export const IMAGE_PROFILES: Record<ImageKind, ImageProfile> = {
  [ImageKind.USER_AVATAR]: {
    width: 256,
    height: 256,
    format: "webp",
    quality: 80,
    contentType: "image/webp",
    maxUploadBytes: 10 * 1024 * 1024,
    allowedUploadTypes: IMAGE_UPLOAD_TYPES,
  },
  [ImageKind.TITLE_POSTER]: {
    ...POSTER_ASPECT,
    format: "webp",
    quality: 82,
    contentType: "image/webp",
    maxUploadBytes: 15 * 1024 * 1024,
    allowedUploadTypes: IMAGE_UPLOAD_TYPES,
  },
  [ImageKind.SEASON_POSTER]: {
    ...POSTER_ASPECT,
    format: "webp",
    quality: 82,
    contentType: "image/webp",
    maxUploadBytes: 15 * 1024 * 1024,
    allowedUploadTypes: IMAGE_UPLOAD_TYPES,
  },
  [ImageKind.ARTIST_PHOTO]: {
    width: 400,
    height: 600,
    format: "webp",
    quality: 82,
    contentType: "image/webp",
    maxUploadBytes: 10 * 1024 * 1024,
    allowedUploadTypes: IMAGE_UPLOAD_TYPES,
  },
};

export function imageProfile(kind: ImageKind): ImageProfile {
  return IMAGE_PROFILES[kind];
}
