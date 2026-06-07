"use client";

import { ReactNode, RefObject, useCallback, useEffect, useRef } from "react";

import useControlsVisibility from "./hooks/useControlsVisibility";
import useFullscreenMode from "./hooks/useFullscreenMode";
import usePlaybackRate from "./hooks/usePlaybackRate";
import usePlayerKeyboard from "./hooks/usePlayerKeyboard";
import useVideoPlayer from "./hooks/useVideoPlayer";
import useVolume from "./hooks/useVolume";
import CustomVideoPlayerContext from "./CustomVideoPlayerContext";
import { clampTime } from "./utils";

interface CustomVideoPlayerProviderProps {
  children: ReactNode;
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  onEnded?: () => void;
}

export default function CustomVideoPlayerProvider({
  children,
  videoRef,
  src,
  onEnded,
}: CustomVideoPlayerProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const volume = useVolume();
  const playbackRate = usePlaybackRate();
  const player = useVideoPlayer(videoRef, src, onEnded);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreenMode(containerRef);
  const controlsVisible = useControlsVisibility(containerRef, player.isPlaying);

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      player.seek(clampTime(time, video.duration || 0));
    },
    [player, videoRef],
  );

  const skip = useCallback(
    (offset: number) => {
      const video = videoRef.current;
      if (!video) return;
      seek(video.currentTime + offset);
    },
    [seek, videoRef],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume.volumeValue;
    video.muted = volume.isMuted;
    video.playbackRate = playbackRate.rate;
  }, [playbackRate.rate, volume.isMuted, volume.volumeValue, videoRef]);

  usePlayerKeyboard({
    videoRef,
    togglePlay: player.togglePlay,
    seek,
    toggleMute: volume.onMuteToggle,
    setVolume: volume.setVolume,
    stepPlaybackRate: playbackRate.step,
    toggleFullscreen,
  });

  return (
    <CustomVideoPlayerContext.Provider
      value={{
        refs: { video: videoRef, container: containerRef },
        playback: {
          isPlaying: player.isPlaying,
          isInitialLoading: player.isInitialLoading,
          isBuffering: player.isBuffering,
          errorMessage: player.errorMessage,
          toggle: player.togglePlay,
          seek,
          skip,
        },
        timeline: {
          current: player.timeline,
          duration: player.duration,
          buffered: player.buffered,
        },
        volume: {
          value: volume.volumeValue,
          isMuted: volume.isMuted,
          set: volume.setVolume,
          seek: volume.onVolumeSeek,
          toggleMute: volume.onMuteToggle,
        },
        fullscreen: { active: isFullscreen, toggle: toggleFullscreen },
        quality: {
          selected: player.quality,
          options: player.qualities,
          currentLevel: player.currentLevelIndex,
          set: player.setQuality,
        },
        playbackRate: {
          value: playbackRate.rate,
          options: playbackRate.options,
          set: playbackRate.set,
          step: playbackRate.step,
        },
        ui: { controlsVisible },
      }}
    >
      {children}
    </CustomVideoPlayerContext.Provider>
  );
}
