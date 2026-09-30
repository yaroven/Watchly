import { ReactionType } from "@/features/comment";

export { ReactionType };

export interface TitleEngagement {
  likes: number;
  dislikes: number;
  watchlistCount: number;
  /** The current viewer's own vote, null if anonymous or not voted. */
  myReaction: ReactionType | null;
  inWatchlist: boolean;
}

export const EMPTY_ENGAGEMENT: TitleEngagement = {
  likes: 0,
  dislikes: 0,
  watchlistCount: 0,
  myReaction: null,
  inWatchlist: false,
};
