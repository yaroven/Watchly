/** S3's own floor is 5MB per part (except the last); this sits comfortably above it. */
export const MULTIPART_PART_SIZE = 8 * 1024 * 1024;

export interface MultipartUploadPart {
  partNumber: number;
  eTag: string;
}
