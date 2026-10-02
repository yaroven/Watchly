import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/client";

export interface TitleEngagementCounts {
  averageScore: number | null;
  ratingCount: number;
  likes: number;
  dislikes: number;
  watchlistCount: number;
}

/**
 * Everything the viewer themselves did to this title.
 *
 * Score lives in here rather than beside the aggregates on purpose. As a flat
 * `myScore` it had to mean both "has not rated" and "anonymous", which is the
 * difference between a control that shows as not-yet-set and one that shows as
 * unknown — and the client cannot tell those apart from a single null.
 */
export class ViewerTitleEngagementDto {
  @ApiProperty({
    nullable: true,
    description: "The viewer's own score, null if they have not set one",
  })
  score: number | null;

  @ApiProperty({ enum: ReactionType, nullable: true, description: "The viewer's own vote" })
  reaction: ReactionType | null;

  @ApiProperty({ description: "Whether the title is on the viewer's watchlist" })
  inWatchlist: boolean;

  constructor(score: number | null, reaction: ReactionType | null, inWatchlist: boolean) {
    this.score = score;
    this.reaction = reaction;
    this.inWatchlist = inWatchlist;
  }
}

/**
 * Score, reactions and watchlist in one block.
 *
 * They are three tables (ADR-0003) and one response: every consumer that wants
 * any of them wants the rest, and splitting them across two blocks meant two
 * aggregate round trips, two densifications and two cache keys for one read.
 */
export class TitleEngagementDto {
  @ApiProperty({ nullable: true, description: "Mean of every score, null until someone rates it" })
  averageScore: number | null;

  @ApiProperty({ description: "How many people have rated it" })
  ratingCount: number;

  @ApiProperty()
  likes: number;

  @ApiProperty()
  dislikes: number;

  @ApiProperty({ description: "How many people have this title on their watchlist" })
  watchlistCount: number;

  @ApiProperty({
    type: ViewerTitleEngagementDto,
    nullable: true,
    description:
      "What the viewer themselves did, or null when the read had no viewer in scope — an anonymous caller, or a server-side render. Distinct from a viewer who simply has not acted.",
  })
  viewer: ViewerTitleEngagementDto | null;

  // Required, not defaulted: "nobody has engaged with this" and "the aggregate was
  // never fetched" must not be able to serialise identically.
  constructor(counts: TitleEngagementCounts, viewer: ViewerTitleEngagementDto | null) {
    // Rounded here so every path that builds the block agrees — a mean of
    // 7.333333333333333 is noise the client would have to trim itself.
    this.averageScore =
      counts.averageScore === null ? null : Math.round(counts.averageScore * 10) / 10;
    this.ratingCount = counts.ratingCount;
    this.likes = counts.likes;
    this.dislikes = counts.dislikes;
    this.watchlistCount = counts.watchlistCount;
    this.viewer = viewer;
  }

  /**
   * For a title that provably has no engagement — one just created, or just
   * deleted. `viewer` is required: null here means "we did not ask", which the
   * client renders as unknown, and these callers know the answer.
   */
  static empty(viewer: ViewerTitleEngagementDto | null): TitleEngagementDto {
    return new TitleEngagementDto(
      { averageScore: null, ratingCount: 0, likes: 0, dislikes: 0, watchlistCount: 0 },
      viewer,
    );
  }
}
