import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CastCreditView } from "../../../../../services/title-cast/title-cast.types";
import { ArtistResponseDto } from "../../../artists/dto/response/artist-response.dto";

export class CastCreditResponseDto implements CastCreditView {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiPropertyOptional()
  character: string | null;

  @ApiProperty()
  order: number;

  @ApiProperty({ type: ArtistResponseDto })
  artist: ArtistResponseDto;
}
