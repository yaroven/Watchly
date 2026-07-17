import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SeasonEntity {
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
  posterUrl?: string | null;

  @ApiProperty({ format: "uuid" })
  titleId: string;
}
