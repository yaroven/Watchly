import { ApiProperty } from "@nestjs/swagger";

export class UploadUrlResponseDto {
  @ApiProperty({
    description:
      "PUT the image here and nothing else: conversion starts from the S3 event, and the processed image is recorded on the entity by the worker. No read URL comes back — the key is stored on the row, and a presigned read URL written into a row outlives its own expiry.",
  })
  uploadUrl: string;

  @ApiProperty({ description: "Key the original will land on in the raw bucket" })
  rawKey: string;

  @ApiProperty({ description: "Uploads larger than this are rejected by the worker" })
  maxBytes: number;
}
