import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GenreView } from "../../../../../services/genre/genre.types";

export class GenreResponseDto implements GenreView {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ description: "Only present when the query counted it" })
  titleCount?: number;
}
