import { EngagementRelations } from "../utils/title.query";
import {
  TitleEngagementCounts,
  TitleEngagementDto,
  ViewerTitleEngagementDto,
} from "./response/title-engagement.dto";

const EMPTY_ENGAGEMENT_COUNTS: TitleEngagementCounts = {
  averageScore: null,
  ratingCount: 0,
  likes: 0,
  dislikes: 0,
  watchlistCount: 0,
};

export default function toTitleEngagementDto(
  rows: EngagementRelations,
  viewerId: string | null,
): TitleEngagementDto {
  const counts: TitleEngagementCounts = rows.engagement
    ? {
        averageScore: rows.engagement.avgScore,
        ratingCount: rows.engagement.ratingCount,
        likes: rows.engagement.likes,
        dislikes: rows.engagement.dislikes,
        watchlistCount: rows.engagement.watchlistCount,
      }
    : EMPTY_ENGAGEMENT_COUNTS;

  return new TitleEngagementDto(
    counts,
    viewerId
      ? new ViewerTitleEngagementDto(
          rows.ratings?.[0]?.score ?? null,
          rows.reactions?.[0]?.type ?? null,
          (rows.watchlistEntries?.length ?? 0) > 0,
        )
      : null,
  );
}
