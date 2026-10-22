import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CastCredit, Title } from "@prisma/client";

export class ArtistFilmographyItemDto {
  @ApiProperty({ format: "uuid" })
  titleId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  posterUrl: string | null;

  @ApiPropertyOptional()
  character?: string | null;

  constructor(castCredit: CastCredit & { title: Title }, posterUrl: string | null = null) {
    this.titleId = castCredit.title.id;
    this.name = castCredit.title.name;
    this.posterUrl = posterUrl;
    this.character = castCredit.character;
  }
}
