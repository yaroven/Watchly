import { ApiProperty } from "@nestjs/swagger";
import { ArtistResponseDto } from "./artist-response.dto";

export class ArtistListResponseDto {
  @ApiProperty({ type: [ArtistResponseDto] })
  items: ArtistResponseDto[];

  @ApiProperty()
  totalCount: number;
}
