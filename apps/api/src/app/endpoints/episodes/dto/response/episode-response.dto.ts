import { ApiProperty } from "@nestjs/swagger";
import { TranscodingStatus } from "@prisma/client";
import { EpisodeView } from "../../../../../services/episode/episode.types";

export class EpisodeResponseDto implements EpisodeView {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  number: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ format: "uuid" })
  seasonId: string;

  @ApiProperty({ enum: TranscodingStatus })
  transcodingStatus: TranscodingStatus;
}
