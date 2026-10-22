import ReactionType from "@/types/reaction-type";

export { ReactionType };

/** Public, viewer-independent: the same numbers for everyone. */
export interface TitleEngagementCounts {
  /** Mean of every score, null until someone rates the title. */
  averageScore: number | null;
  ratingCount: number;
  likes: number;
  dislikes: number;
  watchlistCount: number;
}

/**
 * What the viewer themselves did.
 *
 * `score` lives in here rather than beside the counts: as a flat `myScore` it
 * meant both "has not rated" and "anonymous", which is the difference between a
 * control that renders as not-yet-set and one that renders as unknown.
 */
export interface ViewerTitleEngagement {
  score: number | null;
  reaction: ReactionType | null;
  inWatchlist: boolean;
}

/**
 * `viewer` is null when the read had nobody in scope — an anonymous caller, or a
 * server-side render, which carries no bearer token and so structurally cannot
 * know. Kept separate from the counts so "we did not ask" cannot be mistaken for
 * "asked, and they have not acted": the two would otherwise be the same object,
 * and a control rendered from the second is wrong for a viewer who has acted.
 */
export interface TitleEngagement extends TitleEngagementCounts {
  viewer: ViewerTitleEngagement | null;
}

export interface SetTitleRatingDto {
  score: number;
}
