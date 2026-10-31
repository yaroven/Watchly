import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";
import { ArtistInput } from "../../../../../services/artist/artist.types";

export class CreateArtistDto implements ArtistInput {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;
}
