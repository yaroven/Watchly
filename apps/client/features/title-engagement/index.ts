/** Public API of the title-engagement feature — other features and routes import from here. */
export { default as titleEngagementKeys } from "./api/title-engagement.keys";
export { default as titleEngagementService } from "./api/title-engagement.service";
export { default as useTitleEngagement } from "./api/use-title-engagement";
export { useReactToTitle, useRemoveTitleRating, useSetTitleRating, useSetTitleWatchlist } from "./api/use-title-engagement-mutations";
export { default as useWatchlist } from "./api/use-watchlist";
export { ReactionType } from "./schemas/title-engagement";
export type { TitleEngagement, TitleEngagementCounts, ViewerTitleEngagement } from "./schemas/title-engagement";
