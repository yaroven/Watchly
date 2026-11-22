"use client";

import { useRouter } from "@/i18n/navigation";
import type { Episode } from "@features/episodes";
import { CustomVideoPlayer, VideoPlayerSkeleton } from "@features/player";
import type { Season } from "@features/season";
import StreamEpisodesSidebar from "@features/title/components/StreamEpisodesSidebar";
import StreamFilmInfo from "@features/title/components/StreamFilmInfo";
import StreamPhotos from "@features/title/components/StreamPhotos";
import TitleReviews from "@features/title/components/TitleReviews";
import type { Title } from "@features/title/schemas/title";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { APP } from "@shared/lib/routes";
import { useTranslations } from "next-intl";
import { useSeriesPlayback } from "./use-series-playback";

interface SeriesStreamProps {
  title: Title;
  season: Season;
  episodes: Episode[];
  initialEpisodeUrl?: string;
  initialEpisodeId: string;
}

export default function SeriesStream({ title, season, episodes, initialEpisodeUrl, initialEpisodeId }: SeriesStreamProps) {
  const t = useTranslations("title.episodes");
  const router = useRouter();
  const {
    episode: activeEpisode,
    streamUrl,
    startAt,
    isLoading: isStreamLoading,
    select,
    playNext,
  } = useSeriesPlayback({
    episodes,
    initialEpisodeId,
    initialEpisodeUrl,
  });
  const activeEpisodeId = activeEpisode?.id ?? "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "40px", pb: "64px" }}>
      <Box sx={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <Box
          sx={{
            flex: "2 1 500px",
            minWidth: 0,
            borderRadius: "20px",
            border: "1px solid",
            borderColor: "primary.main",
            overflow: "hidden",
          }}
        >
          {isStreamLoading ? (
            <VideoPlayerSkeleton />
          ) : streamUrl ? (
            <CustomVideoPlayer key={activeEpisodeId} src={streamUrl} startAt={startAt} onEnded={playNext} />
          ) : (
            <Typography sx={{ color: "text.secondary", p: "24px" }}>{t("streamUnavailable")}</Typography>
          )}
        </Box>

        <Box sx={{ flex: "1 1 300px", minWidth: "260px" }}>
          <StreamEpisodesSidebar
            seasonNumber={season.number}
            episodes={episodes}
            currentEpisodeId={activeEpisode?.id ?? ""}
            onSelect={select}
            onSeeAll={() => router.push(`${APP.TITLE(title.id)}#episodes`)}
            posterUrl={season.posterUrl}
          />
        </Box>
      </Box>

      <StreamFilmInfo
        title={title}
        episodeLabel={activeEpisode ? t("streamLabel", { season: season.number, episode: activeEpisode.number }) : undefined}
      />
      <StreamPhotos title={title} />
      <TitleReviews title={title} />
    </Box>
  );
}
