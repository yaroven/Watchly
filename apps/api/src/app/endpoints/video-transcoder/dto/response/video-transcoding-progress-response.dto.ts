import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VideoTranscodingProgressView } from "../../../../../services/queues/video-transcoder/video-transcoder.types";

export class VideoTranscodingProgressResponseDto implements VideoTranscodingProgressView {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  progressPercentage: number;

  @ApiPropertyOptional({ format: "uuid" })
  titleId: string | null;

  @ApiPropertyOptional({ format: "uuid" })
  episodeId: string | null;
}
