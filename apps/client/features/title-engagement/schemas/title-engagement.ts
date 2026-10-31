import ReactionType from "@/types/reaction-type";

export { ReactionType };

export interface TitleEngagementCounts {
  averageScore: number | null;
  ratingCount: number;
  likes: number;
  dislikes: number;
  watchlistCount: number;
}

export interface ViewerTitleEngagement {
  score: number | null;
  reaction: ReactionType | null;
  inWatchlist: boolean;
}

export interface TitleEngagement extends TitleEngagementCounts {
  viewer: ViewerTitleEngagement | null;
}

export interface ReactionResult {
  likes: number;
  dislikes: number;
  commentCount: number;
  myReaction: ReactionType | null;
}

export interface SetTitleRatingDto {
  score: number;
}
