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

export interface StoredViewerTitleEngagementView extends Omit<
  ViewerTitleEngagementView,
  "reaction"
> {
  storedReaction: ReactionType | null;
}

export type CardViewerTitleEngagementView = Omit<ViewerTitleEngagementView, "reaction">;

export interface TitleEngagementView<V = ViewerTitleEngagementView> {
  averageScore: number | null;
  ratingCount: number;
  likes: number;
  dislikes: number;
  watchlistCount: number;
  commentCount: number;
  viewer: V | null;
}

export type StoredTitleEngagementView = TitleEngagementView<StoredViewerTitleEngagementView>;

export type CardTitleEngagementView = TitleEngagementView<CardViewerTitleEngagementView>;
