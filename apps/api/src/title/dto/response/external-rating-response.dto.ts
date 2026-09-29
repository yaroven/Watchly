import { ApiProperty } from "@nestjs/swagger";
import { ExternalRatingSource, ExternalRatings } from "@prisma/client";

export class ExternalRatingResponseDto {
  @ApiProperty({ enum: ExternalRatingSource })
  source: ExternalRatingSource;

  @ApiProperty()
  rating: number;

  @ApiProperty({ nullable: true, description: "Not every source reports a vote count" })
  votesCount: number | null;

  constructor(externalRating: ExternalRatings) {
    this.source = externalRating.source;
    this.rating = externalRating.rating;
    this.votesCount = externalRating.votesCount;
  }
}
