export interface TitleRatingSummary {
  /** Mean of every score, null until someone rates the title. */
  average: number | null;
  count: number;
  /** The current viewer's own score, null if anonymous or not yet rated. */
  myScore: number | null;
}

export interface SetTitleRatingDto {
  score: number;
}
