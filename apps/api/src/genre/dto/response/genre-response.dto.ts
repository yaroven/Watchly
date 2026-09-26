import { ApiProperty } from "@nestjs/swagger";
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

  constructor(genre: Genre) {
    this.id = genre.id;
    this.createdAt = genre.createdAt;
    this.updatedAt = genre.updatedAt;
    this.name = genre.name;
  }
}
