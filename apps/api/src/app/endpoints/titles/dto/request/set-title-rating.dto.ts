import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

export class SetTitleRatingDto {
  @ApiProperty({ minimum: 1, maximum: 10, description: "The viewer's score for this title" })
  @IsInt()
  @Min(1)
  @Max(10)
  score: number;
}
