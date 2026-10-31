import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArtistView } from "../../../../../services/artist/artist.types";

export class ArtistResponseDto implements ArtistView {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  photoUrl: string | null;
}
