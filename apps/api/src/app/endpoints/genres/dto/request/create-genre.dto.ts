import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";
import { GenreInput } from "../../../../../services/genre/genre.types";

export class CreateGenreDto implements GenreInput {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;
}
