import ReactionType from "@/types/reaction-type";

export { ReactionType };

export interface TitleEngagement {
  likes: number;
  dislikes: number;
  watchlistCount: number;
  /** The current viewer's own vote, null if anonymous or not voted. */
  myReaction: ReactionType | null;
  inWatchlist: boolean;
}
