import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TitleType, TranscodingStatus } from "@prisma/client";

export class TitleEntity {
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
}
