import { ExternalRatings } from "@prisma/client";
import { ExternalRatingView } from "./external-ratings.types";

export const toExternalRatingView = (rating: ExternalRatings): ExternalRatingView => ({
  source: rating.source,
  rating: rating.rating,
  votesCount: rating.votesCount,
});
