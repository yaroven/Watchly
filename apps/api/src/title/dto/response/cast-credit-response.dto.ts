import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Artist, CastCredit } from "@prisma/client";
import { ArtistResponseDto } from "../../../artist/dto/response/artist-response.dto";

export class CastCreditResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiPropertyOptional()
  character?: string | null;

  @ApiProperty()
  order: number;

  @ApiProperty({ type: ArtistResponseDto })
  artist: ArtistResponseDto;

  constructor(castCredit: CastCredit & { artist: Artist }) {
    this.id = castCredit.id;
    this.character = castCredit.character;
    this.order = castCredit.order;
    this.artist = new ArtistResponseDto(castCredit.artist);
  }
}
