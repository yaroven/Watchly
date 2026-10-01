import { ApiProperty } from "@nestjs/swagger";

export class AvatarUploadUrlDto {
  @ApiProperty({ description: "Presigned PUT URL for the original image" })
  uploadUrl: string;

  @ApiProperty({ description: "Key the original will land on in the raw bucket" })
  rawKey: string;

  @ApiProperty({ description: "Uploads larger than this are rejected by the worker" })
  maxBytes: number;

  constructor({
    uploadUrl,
    rawKey,
    maxBytes,
  }: {
    uploadUrl: string;
    rawKey: string;
    maxBytes: number;
  }) {
    this.uploadUrl = uploadUrl;
    this.rawKey = rawKey;
    this.maxBytes = maxBytes;
  }
}
