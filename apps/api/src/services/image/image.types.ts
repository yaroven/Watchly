export interface ImageUploadInput {
  contentType: string;
}

export interface ImageUploadUrl {
  uploadUrl: string;
  rawKey: string;
  maxBytes: number;
}
