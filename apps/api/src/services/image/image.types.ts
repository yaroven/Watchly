export interface ImageUploadInput {
  contentType: string;
}

export interface ImageUploadUrl {
  uploadUrl: string;
  rawKey: string;
  maxBytes: number;
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
