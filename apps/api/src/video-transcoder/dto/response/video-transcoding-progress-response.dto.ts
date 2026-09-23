import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VideoTranscodingProgress } from "@prisma/client";

export class VideoTranscodingProgressResponseDto {
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

  constructor(progress: VideoTranscodingProgress) {
    this.id = progress.id;
    this.createdAt = progress.createdAt;
    this.updatedAt = progress.updatedAt;
    this.progressPercentage = progress.progressPercentage;
    this.titleId = progress.titleId;
    this.episodeId = progress.episodeId;
  }
}
