"use client";

import EpisodeService from "@/features/episodes/api/episode.service";
import EpisodeList from "@/features/episodes/components/EpisodeList";
import { Episode } from "@/features/episodes/schemas/episode";
import CustomVideoPlayer, { VideoPlayerSkeleton } from "@/features/player/components/CustomVideoPlayer";
import SeasonTabs from "@/features/season/components/SeasonTabs";
import { Season } from "@/features/season/schemas/season";
import TranscodingStatus from "@/types/transcoding-status";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.scss";

interface SeriesDetailsClientProps {
  seasons: Season[];
  episodes: Episode[];
  initialEpisodeUrl?: string;
  initialEpisodeId: string;
  currentSeasonId: string;
}

export default function SeriesDetailsClient({
  seasons,
  episodes,
  initialEpisodeUrl,
  initialEpisodeId,
  currentSeasonId,
}: SeriesDetailsClientProps) {
  const [episodeId, setEpisodeId] = useQueryState("episode", {
    history: "replace",
    shallow: true,
  });
  const [, setSeasonId] = useQueryState("season", {
    history: "replace",
    shallow: true,
  });
  const [, setT] = useQueryState("t");

  const fallbackEpisodeId = episodes.some((episode) => episode.id === initialEpisodeId) ? initialEpisodeId : (episodes[0]?.id ?? "");
  const activeEpisodeId = episodeId ?? fallbackEpisodeId;

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
      void setT(null, { scroll: false });
    },
    [setEpisodeId, setT],
  );

  const handleSeasonChange = useCallback(
    (id: string) => {
      void setSeasonId(id, { scroll: false });
      void setEpisodeId(null, { scroll: false });
      void setT(null, { scroll: false });
    },
    [setSeasonId, setEpisodeId, setT],
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
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Now playing</h3>
            {activeEpisode ? (
              <p className={styles.nowPlayingMeta}>
                E{activeEpisode.number} · {activeEpisode.name}
              </p>
            ) : (
              <p>Switch episodes without leaving the page.</p>
            )}
          </div>
        </div>

        {isStreamLoading ? (
          <VideoPlayerSkeleton />
        ) : streamUrl && isEpisodeAvailable ? (
          <CustomVideoPlayer key={activeEpisodeId} src={streamUrl} onEnded={handleEpisodeEnded} />
        ) : (
          <div className={styles.noContent}>Video stream is not available for the selected episode yet.</div>
        )}
      </section>

      {seasons.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Seasons</h3>
          </div>
          <SeasonTabs onClick={handleSeasonChange} seasons={seasons} currentSeasonId={currentSeasonId} />
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Episodes</h3>
        </div>
        {episodes.length ? (
          <EpisodeList episodes={episodes} onClick={handleEpisodeChange} currentEpisodeId={activeEpisode?.id ?? ""} />
        ) : (
          <div className={styles.noContent}>Episodes for this season have not been added yet.</div>
        )}
      </section>
    </>
  );
}
