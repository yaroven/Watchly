import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class VideoTranscodingProgressEntity {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  progressPercentage: number;

  @ApiPropertyOptional({ format: "uuid" })
  titleId?: string | null;

  @ApiPropertyOptional({ format: "uuid" })
  episodeId?: string | null;
}
