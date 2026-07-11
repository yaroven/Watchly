"use client";

import { RefObject } from "react";
import { StoreApi } from "zustand";
import { PlayerStoreState } from "../store/playerStore";
import useHlsPlayer from "./useHlsPlayer";
import useVideoElementEvents from "./useVideoElementEvents";

export default function useVideoPlayer(
  videoRef: RefObject<HTMLVideoElement | null>,
  src: string | undefined,
  store: StoreApi<PlayerStoreState>,
  onEnded?: () => void,
) {
  const playback = useVideoElementEvents(videoRef, store, onEnded);

  useHlsPlayer(videoRef, src, store, {
    beginSourceLoad: playback.beginSourceLoad,
    clearSource: playback.clearSource,
  });
}
