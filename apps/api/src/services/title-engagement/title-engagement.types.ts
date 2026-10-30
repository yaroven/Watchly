import { ReactionType } from "@prisma/client";
import { EngagementCounts } from "../engagement/engagement-counters.service";

export interface TitleEngagementCounts extends EngagementCounts {
  averageScore: number | null;
  ratingCount: number;
  watchlistCount: number;
}

export interface ViewerTitleEngagementView {
  score: number | null;
  reaction: ReactionType | null;
  inWatchlist: boolean;
}

export interface TitleEngagementView {
  averageScore: number | null;
  ratingCount: number;
  likes: number;
  dislikes: number;
  watchlistCount: number;
  commentCount: number;
  viewer: ViewerTitleEngagementView | null;
}
