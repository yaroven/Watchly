/** Public API of the title-rating feature — other features and routes import from here. */
export { default as titleRatingKeys } from "./api/title-rating.keys";
export { default as titleRatingService } from "./api/title-rating.service";
export { default as useTitleRating } from "./api/use-title-rating";
export { useRemoveTitleRating, useSetTitleRating } from "./api/use-title-rating-mutations";
export type { TitleRatingSummary } from "./schemas/title-rating";
