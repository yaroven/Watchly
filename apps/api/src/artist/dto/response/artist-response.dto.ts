import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Artist } from "@prisma/client";

export class ArtistResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  photoUrl?: string | null;

  constructor(artist: Artist) {
    this.id = artist.id;
    this.createdAt = artist.createdAt;
    this.updatedAt = artist.updatedAt;
    this.name = artist.name;
    this.photoUrl = artist.photoUrl;
  }
}
