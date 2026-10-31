import { countsOf, NO_COUNTS } from "../engagement/engagement-counters.service";
import { Vote } from "../reaction/utils/vote.util";
import {
  CardTitleEngagementView,
  StoredTitleEngagementView,
  TitleEngagementCounts,
  TitleEngagementView,
  ViewerTitleEngagementView,
} from "./title-engagement.types";
import { EngagementRelations } from "./utils/title.query";

const NO_ENGAGEMENT: TitleEngagementCounts = {
  ...NO_COUNTS,
  averageScore: null,
  ratingCount: 0,
  watchlistCount: 0,
};

export const toTitleEngagementView = <V>(
  counts: TitleEngagementCounts,
  viewer: V | null,
): TitleEngagementView<V> => ({
  averageScore: counts.averageScore === null ? null : Math.round(counts.averageScore * 10) / 10,
  ratingCount: counts.ratingCount,
  likes: counts.likes,
  dislikes: counts.dislikes,
  watchlistCount: counts.watchlistCount,
  commentCount: counts.commentCount,
  viewer,
});

export const emptyTitleEngagementView = (
  viewer: ViewerTitleEngagementView | null,
): TitleEngagementView => toTitleEngagementView(NO_ENGAGEMENT, viewer);

export const titleEngagementViewFromRelations = (
  rows: EngagementRelations,
  viewerId: string | null,
): StoredTitleEngagementView => {
  const counts: TitleEngagementCounts = {
    ...NO_ENGAGEMENT,
    ...countsOf(rows.counters),
    ...(rows.engagement
      ? {
          averageScore: rows.engagement.avgScore,
          ratingCount: rows.engagement.ratingCount,
          watchlistCount: rows.engagement.watchlistCount,
        }
      : {}),
  };

  return toTitleEngagementView(
    counts,
    viewerId
      ? {
          score: rows.ratings?.[0]?.score ?? null,
          storedReaction: rows.reactions?.[0]?.type ?? null,
          inWatchlist: (rows.watchlistEntries?.length ?? 0) > 0,
        }
      : null,
  );
};

export const withVote = (view: StoredTitleEngagementView, vote: Vote): TitleEngagementView => ({
  ...view,
  viewer: view.viewer && {
    score: view.viewer.score,
    reaction: vote,
    inWatchlist: view.viewer.inWatchlist,
  },
});

export const withoutVote = (view: StoredTitleEngagementView): CardTitleEngagementView => ({
  ...view,
  viewer: view.viewer && { score: view.viewer.score, inWatchlist: view.viewer.inWatchlist },
});
