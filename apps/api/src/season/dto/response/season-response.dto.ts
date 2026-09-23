import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Season } from "@prisma/client";

export class SeasonResponseDto {
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

  @ApiPropertyOptional()
  posterUrl?: string | null;

  @ApiProperty({ format: "uuid" })
  titleId: string;

  constructor(season: Season) {
    this.id = season.id;
    this.createdAt = season.createdAt;
    this.updatedAt = season.updatedAt;
    this.number = season.number;
    this.name = season.name;
    this.description = season.description;
    this.posterUrl = season.posterUrl;
    this.titleId = season.titleId;
  }
}
