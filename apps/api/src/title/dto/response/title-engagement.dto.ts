import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/client";
import { EngagementRelations } from "../../utils/title.query";

export interface TitleEngagementCounts {
  averageScore: number | null;
  ratingCount: number;
  likes: number;
  dislikes: number;
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
  averageScore: null,
  ratingCount: 0,
  likes: 0,
  dislikes: 0,
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
    this.viewer = viewer;
  }

  static empty(viewer: ViewerTitleEngagementDto | null): TitleEngagementDto {
    return new TitleEngagementDto(NO_ENGAGEMENT, viewer);
  }

  static fromRelations(rows: EngagementRelations, viewerId: string | null): TitleEngagementDto {
    const counts: TitleEngagementCounts = rows.engagement
      ? {
          averageScore: rows.engagement.avgScore,
          ratingCount: rows.engagement.ratingCount,
          likes: rows.engagement.likes,
          dislikes: rows.engagement.dislikes,
          watchlistCount: rows.engagement.watchlistCount,
        }
      : NO_ENGAGEMENT;

    return new TitleEngagementDto(
      counts,
      viewerId
        ? new ViewerTitleEngagementDto(
            rows.ratings?.[0]?.score ?? null,
            rows.reactions?.[0]?.type ?? null,
            (rows.watchlistEntries?.length ?? 0) > 0,
          )
        : null,
    );
  }
}
