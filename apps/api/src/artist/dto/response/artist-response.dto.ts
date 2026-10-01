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

  constructor(artist: Artist, photoUrl: string | null = null) {
    this.id = artist.id;
    this.createdAt = artist.createdAt;
    this.updatedAt = artist.updatedAt;
    this.name = artist.name;
    // Derived from `artist.photoKey` by the caller, never stored: a presigned
    // URL in a row keeps claiming it works after its signature expires.
    this.photoUrl = photoUrl;
  }
}
