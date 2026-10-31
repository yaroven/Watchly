import { ApiProperty } from "@nestjs/swagger";

export class UrlResponseDto {
  @ApiProperty()
  url: string;
}
