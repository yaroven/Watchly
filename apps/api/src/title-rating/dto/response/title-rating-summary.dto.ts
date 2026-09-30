import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * What a title's rating looks like to one viewer: the crowd's verdict plus
 * their own, so the UI can render the average and pre-select the control from
 * a single response.
 */
export class TitleRatingSummaryDto {
  @ApiPropertyOptional({ description: "Mean of every score, null until someone rates it" })
  average: number | null;

  @ApiProperty({ description: "How many people have rated it" })
  count: number;

  @ApiPropertyOptional({
    description: "The current viewer's own score, null if they have not rated or are anonymous",
  })
  myScore: number | null;

  constructor({
    average,
    count,
    myScore,
  }: {
    average: number | null;
    count: number;
    myScore: number | null;
  }) {
    // One decimal is what the UI shows; keeping the extra precision would only
    // produce averages that disagree with the number on screen.
    this.average = average === null ? null : Math.round(average * 10) / 10;
    this.count = count;
    this.myScore = myScore;
  }
}
