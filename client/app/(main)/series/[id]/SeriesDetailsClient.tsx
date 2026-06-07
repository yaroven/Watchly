"use client";

import EpisodeService from "@/features/episodes/api/episode.service";
import EpisodeList from "@/features/episodes/components/EpisodeList";
import { Episode } from "@/features/episodes/schemas/episode";
import CustomVideoPlayer from "@/features/player/components/CustomVideoPlayer";
import { VideoPlayerSkeleton } from "@/features/player/components/CustomVideoPlayer";
import SeasonTabs from "@/features/season/components/SeasonTabs";
import { Season } from "@/features/season/schemas/season";
import TranscodingStatus from "@/types/transcoding-status";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const episodeIdFromUrl = searchParams.get("episode");
  const fallbackEpisodeId = episodes.some((episode) => episode.id === initialEpisodeId)
    ? initialEpisodeId
    : (episodes[0]?.id ?? "");
  const activeEpisodeId = episodeIdFromUrl ?? fallbackEpisodeId;

  const activeEpisode = useMemo(
    () => episodes.find((episode) => episode.id === activeEpisodeId) ?? episodes[0],
    [activeEpisodeId, episodes],
  );

  const [streamUrl, setStreamUrl] = useState(initialEpisodeUrl ?? "");
  const [isStreamLoading, setIsStreamLoading] = useState(false);

  useEffect(() => {
    if (!activeEpisodeId) {
      setStreamUrl("");
      return;
    }

    if (activeEpisodeId === initialEpisodeId && initialEpisodeUrl) {
      setStreamUrl(initialEpisodeUrl);
      return;
    }

    let cancelled = false;
    setIsStreamLoading(true);

    EpisodeService.getStreamUrl(activeEpisodeId)
      .then((url) => {
        if (!cancelled) setStreamUrl(url);
      })
      .catch(() => {
        if (!cancelled) setStreamUrl("");
      })
      .finally(() => {
        if (!cancelled) setIsStreamLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeEpisodeId, initialEpisodeId, initialEpisodeUrl]);

  const handleEpisodeChange = useCallback(
    (id: string) => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("episode", id);
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleSeasonChange = useCallback(
    (id: string) => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("season", id);
      newParams.delete("episode");
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
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
          <CustomVideoPlayer
            key={activeEpisodeId}
            src={streamUrl}
            onEnded={handleEpisodeEnded}
          />
        ) : (
          <div className={styles.noContent}>
            Video stream is not available for the selected episode yet.
          </div>
        )}
      </section>

      {seasons.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Seasons</h3>
          </div>
          <SeasonTabs
            onClick={handleSeasonChange}
            seasons={seasons}
            currentSeasonId={currentSeasonId}
          />
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Episodes</h3>
        </div>
        {episodes.length ? (
          <EpisodeList
            episodes={episodes}
            onClick={handleEpisodeChange}
            currentEpisodeId={activeEpisode?.id ?? ""}
          />
        ) : (
          <div className={styles.noContent}>Episodes for this season have not been added yet.</div>
        )}
      </section>
    </>
  );
}
