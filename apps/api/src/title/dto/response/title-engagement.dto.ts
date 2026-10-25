import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/client";
import {
  countsOf,
  EngagementCounts,
  NO_COUNTS,
} from "../../../engagement/engagement-counters.service";
import { resolveVote, Vote } from "../../../reaction/utils/vote.util";
import { EngagementRelations } from "../../utils/title.query";

export interface TitleEngagementCounts extends EngagementCounts {
  averageScore: number | null;
  ratingCount: number;
  watchlistCount: number;
}

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

const NO_ENGAGEMENT: TitleEngagementCounts = {
  ...NO_COUNTS,
  averageScore: null,
  ratingCount: 0,
  watchlistCount: 0,
};

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

  @ApiProperty({ description: "Top-level comments on the title, replies not counted" })
  commentCount: number;

  @ApiProperty({
    type: ViewerTitleEngagementDto,
    nullable: true,
    description:
      "What the viewer themselves did, or null when the read had no viewer in scope — an anonymous caller, or a server-side render. Distinct from a viewer who simply has not acted.",
  })
  viewer: ViewerTitleEngagementDto | null;

  constructor(counts: TitleEngagementCounts, viewer: ViewerTitleEngagementDto | null) {
    this.averageScore =
      counts.averageScore === null ? null : Math.round(counts.averageScore * 10) / 10;
    this.ratingCount = counts.ratingCount;
    this.likes = counts.likes;
    this.dislikes = counts.dislikes;
    this.watchlistCount = counts.watchlistCount;
    this.commentCount = counts.commentCount;
    this.viewer = viewer;
  }

  static empty(viewer: ViewerTitleEngagementDto | null): TitleEngagementDto {
    return new TitleEngagementDto(NO_ENGAGEMENT, viewer);
  }

  /**
   * The block is two cached rows, both relations: the title-only one and the
   * shared counters every subject has. A title with neither reads as zeroes,
   * which is the truth — the rows are written the first time something is
   * counted.
   */
  static fromRelations(
    rows: EngagementRelations,
    viewerId: string | null,
    myReaction?: Vote,
  ): TitleEngagementDto {
    const counts: TitleEngagementCounts = {
      ...NO_ENGAGEMENT,
      ...countsOf(rows.counters),
      ...(rows.engagement
        ? {
            averageScore: rows.engagement.avgScore,
            ratingCount: rows.engagement.ratingCount,
            watchlistCount: rows.engagement.watchlistCount,
          }
        : {}),
    };

    return new TitleEngagementDto(
      counts,
      viewerId
        ? new ViewerTitleEngagementDto(
            rows.ratings?.[0]?.score ?? null,
            resolveVote(myReaction, rows.reactions?.[0]?.type ?? null),
            (rows.watchlistEntries?.length ?? 0) > 0,
          )
        : null,
    );
  }
}
