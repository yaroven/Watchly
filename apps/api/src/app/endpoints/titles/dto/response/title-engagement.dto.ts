import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/client";
import {
  TitleEngagementView,
  ViewerTitleEngagementView,
} from "../../../../../services/title-engagement/title-engagement.types";

export class ViewerTitleEngagementDto implements ViewerTitleEngagementView {
  @ApiProperty({
    nullable: true,
    description: "The viewer's own score, null if they have not set one",
  })
  score: number | null;

  @ApiProperty({ enum: ReactionType, nullable: true, description: "The viewer's own vote" })
  reaction: ReactionType | null;

  @ApiProperty({ description: "Whether the title is on the viewer's watchlist" })
  inWatchlist: boolean;
}

export class TitleEngagementDto implements TitleEngagementView {
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
}
