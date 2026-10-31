import { ApiProperty } from "@nestjs/swagger";
import { ExternalRatingSource } from "@prisma/client";
import { ExternalRatingView } from "../../../../../services/external-ratings/external-ratings.types";

export class ExternalRatingResponseDto implements ExternalRatingView {
  @ApiProperty({ enum: ExternalRatingSource })
  source: ExternalRatingSource;

  @ApiProperty()
  rating: number;

  @ApiProperty({ nullable: true, description: "Not every source reports a vote count" })
  votesCount: number | null;
}
