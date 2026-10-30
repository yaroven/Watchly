import { countsOf, NO_COUNTS } from "../engagement/engagement-counters.service";
import { resolveVote, Vote } from "../reaction/utils/vote.util";
import { EngagementRelations } from "../title/utils/title.query";
import {
  TitleEngagementCounts,
  TitleEngagementView,
  ViewerTitleEngagementView,
} from "./title-engagement.types";

const NO_ENGAGEMENT: TitleEngagementCounts = {
  ...NO_COUNTS,
  averageScore: null,
  ratingCount: 0,
  watchlistCount: 0,
};

export const toTitleEngagementView = (
  counts: TitleEngagementCounts,
  viewer: ViewerTitleEngagementView | null,
): TitleEngagementView => ({
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
  myReaction?: Vote,
): TitleEngagementView => {
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
          reaction: resolveVote(myReaction, rows.reactions?.[0]?.type ?? null),
          inWatchlist: (rows.watchlistEntries?.length ?? 0) > 0,
        }
      : null,
  );
};
