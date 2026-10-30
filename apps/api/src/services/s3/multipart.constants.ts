export const MULTIPART_PART_SIZE = 8 * 1024 * 1024;

export interface MultipartUploadPart {
  partNumber: number;
  eTag: string;
}
