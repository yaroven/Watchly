import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArtistFilmographyItemView } from "../../../../../services/artist/artist.types";

export class ArtistFilmographyItemDto implements ArtistFilmographyItemView {
  @ApiProperty({ format: "uuid" })
  titleId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  posterUrl: string | null;

  @ApiPropertyOptional()
  character: string | null;
}
