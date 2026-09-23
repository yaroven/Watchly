import { ApiProperty } from "@nestjs/swagger";
import { Episode, TranscodingStatus } from "@prisma/client";

export class EpisodeResponseDto {
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

  constructor(episode: Episode) {
    this.id = episode.id;
    this.createdAt = episode.createdAt;
    this.updatedAt = episode.updatedAt;
    this.number = episode.number;
    this.name = episode.name;
    this.description = episode.description;
    this.seasonId = episode.seasonId;
    this.transcodingStatus = episode.transcodingStatus;
  }
}
