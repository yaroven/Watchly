import { ExternalRatingSource } from "@prisma/client";

export interface ExternalRatingView {
  source: ExternalRatingSource;
  rating: number;
  votesCount: number | null;
}

export interface SyncExternalRatingsResult {
  total: number;
  synced: number;
}
