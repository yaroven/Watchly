import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SeasonView } from "../../../../../services/season/season.types";

export class SeasonResponseDto implements SeasonView {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  number: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  posterUrl: string | null;

  @ApiProperty({ format: "uuid" })
  titleId: string;
}
