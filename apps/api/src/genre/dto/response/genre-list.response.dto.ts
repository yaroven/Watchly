import { ApiProperty } from "@nestjs/swagger";
import { GenreResponseDto } from "./genre-response.dto";

export class GenreListResponseDto {
  @ApiProperty({ type: [GenreResponseDto] })
  items: GenreResponseDto[];

  @ApiProperty()
  totalCount: number;
}
