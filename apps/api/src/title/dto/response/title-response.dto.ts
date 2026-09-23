import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Title, TitleType, TranscodingStatus } from "@prisma/client";

export class TitleResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: TitleType })
  type: TitleType;

  @ApiProperty()
  posterUrl: string;

  @ApiPropertyOptional()
  hlsUrl?: string | null;

  @ApiProperty({ enum: TranscodingStatus })
  transcodingStatus: TranscodingStatus;

  constructor(title: Title) {
    this.id = title.id;
    this.createdAt = title.createdAt;
    this.updatedAt = title.updatedAt;
    this.name = title.name;
    this.description = title.description;
    this.type = title.type;
    this.posterUrl = title.posterUrl;
    this.hlsUrl = title.hlsUrl;
    this.transcodingStatus = title.transcodingStatus;
  }
}
