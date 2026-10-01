import ReactionType from "@/types/reaction-type";

export { ReactionType };

/** Public, viewer-independent: the same numbers for everyone. */
export interface TitleEngagementCounts {
  likes: number;
  dislikes: number;
  watchlistCount: number;
}

export interface ViewerTitleEngagement {
  myReaction: ReactionType | null;
  inWatchlist: boolean;
}

/**
 * `viewer` is null when the read had nobody in scope — an anonymous caller, or a
 * server-side render, which carries no bearer token and so structurally cannot
 * know. Kept separate from the counts so "we did not ask" cannot be mistaken for
 * "asked, and they have not voted": the two would otherwise be the same object,
 * and a control rendered from the second is wrong for a viewer who has voted.
 */
export interface TitleEngagement extends TitleEngagementCounts {
  viewer: ViewerTitleEngagement | null;
}
