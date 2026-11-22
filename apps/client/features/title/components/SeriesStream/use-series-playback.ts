"use client";

import { type Episode, useEpisodeStreamUrl } from "@features/episodes";
import { useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { isPlayable } from "../../lib/playback-resolution";
import { nextEpisode, startEpisode } from "./episode-session";

interface SeriesPlaybackInput {
  episodes: Episode[];
  initialEpisodeId: string;
  initialEpisodeUrl?: string;
}

export function useSeriesPlayback({ episodes, initialEpisodeId, initialEpisodeUrl }: SeriesPlaybackInput) {
  const [episodeParam, setEpisodeParam] = useQueryState("episode", { history: "replace", shallow: true, scroll: false });
  const [startAt, setStartAt] = useState(readStartTime);

  const episode = useMemo(() => startEpisode(episodes, episodeParam ?? initialEpisodeId), [episodeParam, episodes, initialEpisodeId]);
  const episodeId = episode?.id ?? "";
  const usesServerUrl = episodeId === initialEpisodeId && !!initialEpisodeUrl;
  const canPlay = !!episode && isPlayable(episode);

  const { data: fetchedUrl, isPending } = useEpisodeStreamUrl(episodeId, { enabled: canPlay && !usesServerUrl });
  const streamUrl = !canPlay ? undefined : usesServerUrl ? initialEpisodeUrl : fetchedUrl || undefined;

  const select = useCallback(
    (id: string) => {
      setStartAt(0);
      void setEpisodeParam(id);
    },
    [setEpisodeParam],
  );

  const playNext = useCallback(() => {
    const next = episodeId ? nextEpisode(episodes, episodeId) : undefined;
    if (next) select(next.id);
  }, [episodeId, episodes, select]);

  return {
    episode,
    streamUrl,
    startAt,
    isLoading: canPlay && !usesServerUrl && isPending,
    select,
    playNext,
  };
}

function readStartTime(): number {
  if (typeof window === "undefined") return 0;
  const seconds = Number.parseInt(new URLSearchParams(window.location.search).get("t") ?? "", 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}
