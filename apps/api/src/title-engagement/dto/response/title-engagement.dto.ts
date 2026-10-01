import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/client";

export interface TitleEngagementCounts {
  likes: number;
  dislikes: number;
  watchlistCount: number;
}

export class ViewerTitleEngagementDto {
  @ApiProperty({ enum: ReactionType, nullable: true, description: "The viewer's own vote" })
  myReaction: ReactionType | null;

  @ApiProperty({ description: "Whether the title is on the viewer's watchlist" })
  inWatchlist: boolean;

  constructor(myReaction: ReactionType | null, inWatchlist: boolean) {
    this.myReaction = myReaction;
    this.inWatchlist = inWatchlist;
  }
}

export class TitleEngagementDto {
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
      "The viewer's own vote and watchlist state, or null when the read had no viewer in scope — an anonymous caller, or a server-side render. Distinct from a viewer who simply has not voted.",
  })
  viewer: ViewerTitleEngagementDto | null;

  // Required, not defaulted: "nobody has engaged with this" and "the aggregate was
  // never fetched" must not be able to serialise identically.
  constructor(counts: TitleEngagementCounts, viewer: ViewerTitleEngagementDto | null) {
    this.likes = counts.likes;
    this.dislikes = counts.dislikes;
    this.watchlistCount = counts.watchlistCount;
    this.viewer = viewer;
  }

  /** For a title that provably has no engagement — one just created, or just deleted. */
  static empty(viewer: ViewerTitleEngagementDto | null = null): TitleEngagementDto {
    return new TitleEngagementDto({ likes: 0, dislikes: 0, watchlistCount: 0 }, viewer);
  }
}
