import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CastCreditView } from "../../../../../services/title-cast/title-cast.types";
import { ContentLocaleDto } from "../../../../dto/response/content-locale.dto";
import { ArtistResponseDto } from "../../../artists/dto/response/artist-response.dto";
import { CharacterTranslationsDto } from "../request/set-title-cast.dto";

export class CastCreditResponseDto implements CastCreditView {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiPropertyOptional({
    description: "In the requested language where translated, English otherwise",
  })
  character: string | null;

  @ApiProperty({
    type: CharacterTranslationsDto,
    description: "Every stored translation of the character, whatever the request language",
  })
  characterTranslations: CharacterTranslationsDto;

  @ApiProperty()
  order: number;

  @ApiProperty({ type: ArtistResponseDto })
  artist: ArtistResponseDto;

  @ApiProperty({ type: ContentLocaleDto, description: "The language `character` is in" })
  content: ContentLocaleDto;
}
