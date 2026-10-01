import { ApiProperty } from "@nestjs/swagger";

export class UploadUrlResponseDto {
  @ApiProperty({
    description:
      "PUT the image here, then save the entity with the upload flag set. No read URL comes back: the key is derived from the entity, and a presigned read URL stored in a row outlives its own expiry.",
  })
  uploadUrl: string;
}
