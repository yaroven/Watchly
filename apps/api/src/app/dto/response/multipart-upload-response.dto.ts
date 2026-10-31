import { ApiProperty } from "@nestjs/swagger";

export class UploadPartUrlDto {
  @ApiProperty({ minimum: 1 })
  partNumber: number;

  @ApiProperty()
  url: string;
}

export class MultipartUploadResponseDto {
  @ApiProperty()
  uploadId: string;

  @ApiProperty({
    description:
      "Bytes per part — slice the file into chunks of this size, last one may be smaller",
  })
  partSize: number;

  @ApiProperty({ type: [UploadPartUrlDto] })
  parts: UploadPartUrlDto[];
}
