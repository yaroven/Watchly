"use client";

import TranscodingStatus from "@/types/transcoding-status";
import EpisodeService from "@features/episodes/api/episode.service";
import type { Episode } from "@features/episodes/schemas/episode";
import CustomVideoPlayer, { VideoPlayerSkeleton } from "@features/player/components/CustomVideoPlayer";
import type { Season } from "@features/season/schemas/season";
import StreamEpisodesSidebar from "@features/title/components/StreamEpisodesSidebar";
import StreamFilmInfo from "@features/title/components/StreamFilmInfo";
import StreamPhotos from "@features/title/components/StreamPhotos";
import { getTitleOverviewFixture } from "@features/title/components/TitleOverview/mocks";
import TitleReviews from "@features/title/components/TitleReviews";
import type { Title } from "@features/title/schemas/title";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { APP } from "@shared/lib/routes";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";

interface SeriesStreamProps {
  title: Title;
  season: Season;
  episodes: Episode[];
  initialEpisodeUrl?: string;
  initialEpisodeId: string;
}

export default function SeriesStream({ title, season, episodes, initialEpisodeUrl, initialEpisodeId }: SeriesStreamProps) {
  const router = useRouter();
  const { scores } = getTitleOverviewFixture(title.id);
  const [episodeId, setEpisodeId] = useQueryState("episode", { history: "replace", shallow: true });

  const activeEpisodeId = episodeId ?? initialEpisodeId;
  const activeEpisode = useMemo(
    () => episodes.find((episode) => episode.id === activeEpisodeId) ?? episodes[0],
    [activeEpisodeId, episodes],
  );

  const [fetchedUrl, setFetchedUrl] = useState("");
  const streamUrl = activeEpisodeId === initialEpisodeId && initialEpisodeUrl ? initialEpisodeUrl : fetchedUrl;
  const isStreamLoading = !!(activeEpisodeId && activeEpisodeId !== initialEpisodeId && !fetchedUrl);

  useEffect(() => {
    if (!activeEpisodeId) return;
    if (activeEpisodeId === initialEpisodeId && initialEpisodeUrl) return;

    let cancelled = false;

    EpisodeService.getStreamUrl(activeEpisodeId)
      .then((url) => {
        if (!cancelled) setFetchedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFetchedUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [activeEpisodeId, initialEpisodeId, initialEpisodeUrl]);

  const handleEpisodeChange = useCallback(
    (id: string) => {
      void setEpisodeId(id, { scroll: false });
    },
    [setEpisodeId],
  );

  const handleEpisodeEnded = useCallback(() => {
    if (!activeEpisode) return;

    const currentIndex = episodes.findIndex((episode) => episode.id === activeEpisode.id);
    const nextEpisode = episodes[currentIndex + 1];

    if (!nextEpisode || nextEpisode.transcodingStatus !== TranscodingStatus.COMPLETED) return;

    handleEpisodeChange(nextEpisode.id);
  }, [activeEpisode, episodes, handleEpisodeChange]);

  const isEpisodeAvailable = activeEpisode?.transcodingStatus === TranscodingStatus.COMPLETED;

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
          ) : streamUrl && isEpisodeAvailable ? (
            <CustomVideoPlayer key={activeEpisodeId} src={streamUrl} onEnded={handleEpisodeEnded} />
          ) : (
            <Typography sx={{ color: "text.secondary", p: "24px" }}>Video stream is not available for the selected episode yet.</Typography>
          )}
        </Box>

        <Box sx={{ flex: "1 1 300px", minWidth: "260px" }}>
          <StreamEpisodesSidebar
            seasonNumber={season.number}
            episodes={episodes}
            currentEpisodeId={activeEpisode?.id ?? ""}
            onSelect={handleEpisodeChange}
            onSeeAll={() => router.push(`${APP.TITLE(title.id)}#episodes`)}
            posterUrl={season.posterUrl}
          />
        </Box>
      </Box>

      <StreamFilmInfo
        title={title}
        rating={scores.tmovie}
        episodeLabel={activeEpisode ? `(Season ${season.number}, Episode ${activeEpisode.number})` : undefined}
      />
      <StreamPhotos title={title} />
      <TitleReviews title={title} />
    </Box>
  );
}
