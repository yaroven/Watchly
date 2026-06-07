"use client";

import { RefObject } from "react";

import useHlsPlayer from "./useHlsPlayer";
import useVideoElementEvents from "./useVideoElementEvents";

export default function useVideoPlayer(
  videoRef: RefObject<HTMLVideoElement | null>,
  src?: string,
  onEnded?: () => void,
) {
  const playback = useVideoElementEvents(videoRef, onEnded);

  const hls = useHlsPlayer(videoRef, src, {
    beginSourceLoad: playback.beginSourceLoad,
    clearSource: playback.clearSource,
    setErrorMessage: playback.setErrorMessage,
    setIsInitialLoading: playback.setIsInitialLoading,
    setIsBuffering: playback.setIsBuffering,
  });

  return {
    isPlaying: playback.isPlaying,
    isInitialLoading: playback.isInitialLoading,
    isBuffering: playback.isBuffering,
    timeline: playback.timeline,
    buffered: playback.buffered,
    duration: playback.duration,
    errorMessage: playback.errorMessage,
    togglePlay: playback.togglePlay,
    seek: playback.seek,
    qualities: hls.qualities,
    quality: hls.quality,
    setQuality: hls.setQuality,
    currentLevelIndex: hls.currentLevelIndex,
  };
}
