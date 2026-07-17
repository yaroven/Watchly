import { ApiProperty } from "@nestjs/swagger";

export class UploadUrlResponseDto {
  @ApiProperty()
  uploadUrl: string;

  @ApiProperty()
  posterUrl: string;
}
