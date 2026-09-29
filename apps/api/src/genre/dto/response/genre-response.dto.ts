import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Genre } from "@prisma/client";

export class GenreResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ description: "Only present when the query counted it" })
  titleCount?: number;

  constructor(genre: Genre & { _count?: { titles: number } }) {
    this.id = genre.id;
    this.createdAt = genre.createdAt;
    this.updatedAt = genre.updatedAt;
    this.name = genre.name;
    this.titleCount = genre._count?.titles;
  }
}
