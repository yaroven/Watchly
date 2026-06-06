"use client";

import useVideoPlayer from "@/features/player/components/CustomVideoPlayer/hooks/useVideoPlayer";
import useVolume from "@/features/player/components/CustomVideoPlayer/hooks/useVolume";
import { ReactNode, RefObject, useEffect, useEffectEvent, useRef, useState } from "react";

import CustomVideoPlayerContext from "./CustomVideoPlayerContext";

interface CustomVideoPlayerProviderProps {
  children: ReactNode;
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
}

export default function CustomVideoPlayerProvider({
  children,
  videoRef,
  src,
}: CustomVideoPlayerProviderProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setFullscreen] = useState(false);
  const wasFullscreenRef = useRef(false);
  const { onMuteToggle, onVolumeSeek, isMuted, volumeValue, setVolume } = useVolume();
  const {
    isPlaying,
    isLoading,
    timeline,
    buffered,
    errorMessage,
    togglePlay,
    seek,
    duration,
    qualities,
    quality,
    setQuality,
    currentLevelIndex,
  } = useVideoPlayer(videoRef, src);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isActuallyFullscreen = !!document.fullscreenElement;
      if (!isActuallyFullscreen && wasFullscreenRef.current)
        videoContainerRef.current?.scrollIntoView({ block: "center", behavior: "auto" });

      wasFullscreenRef.current = isActuallyFullscreen;
      setFullscreen(isActuallyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volumeValue;
      videoRef.current.muted = isMuted;
    }
  }, [volumeValue, isMuted, videoRef]);

  useEffect(() => {
    if (isFullscreen) {
      if (!document.fullscreenElement) {
        void videoContainerRef.current?.requestFullscreen();
      }
    } else if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
  }, [isFullscreen]);

  const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const activeTag = document.activeElement?.tagName.toLowerCase();
    if (activeTag === "input" || activeTag === "textarea") return;

    const video = videoRef.current;

    if (e.code === "Space" || e.key === "k" || e.key === "K") {
      e.preventDefault();
      void togglePlay();
      return;
    }

    if (e.key === "m" || e.key === "M") {
      if (e.repeat) return;
      e.preventDefault();
      onMuteToggle();
      return;
    }

    if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      setFullscreen((prev) => !prev);
      return;
    }

    if (!video) return;

    if (e.code === "ArrowLeft") {
      e.preventDefault();
      seek(video.currentTime - 5);
      return;
    }

    if (e.code === "ArrowRight") {
      e.preventDefault();
      seek(video.currentTime + 5);
      return;
    }

    if (e.code === "ArrowUp") {
      e.preventDefault();
      setVolume((value) => Math.min(value + 0.1, 1));
      return;
    }

    if (e.code === "ArrowDown") {
      e.preventDefault();
      setVolume((value) => Math.max(value - 0.1, 0));
    }
  });

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const timeoutRef = useRef<number | null>(null);
  const clearControlsTimeout = useEffectEvent(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  });
  const revealControls = useEffectEvent(() => {
    setAreControlsVisible(true);
    clearControlsTimeout();

    if (isPlaying) {
      timeoutRef.current = window.setTimeout(() => {
        setAreControlsVisible(false);
      }, 2500);
    }
  });

  useEffect(() => {
    if (!isPlaying) {
      if (!areControlsVisible) {
        queueMicrotask(() => setAreControlsVisible(true));
      }
      clearControlsTimeout();
      return;
    }

    const el = videoContainerRef.current;
    if (el) {
      el.addEventListener("mousemove", revealControls);
      el.addEventListener("click", revealControls);
      el.addEventListener("touchstart", revealControls, { passive: true });
    }
    revealControls();

    return () => {
      if (el) {
        el.removeEventListener("mousemove", revealControls);
        el.removeEventListener("click", revealControls);
        el.removeEventListener("touchstart", revealControls);
      }
      clearControlsTimeout();
    };
  }, [areControlsVisible, isPlaying]);

  return (
    <CustomVideoPlayerContext.Provider
      value={{
        videoRef,
        videoContainerRef,
        isPlaying,
        areControlsVisible,
        isLoading,
        errorMessage,
        timeline,
        buffered,
        duration,
        volumeValue,
        isMuted,
        isFullscreen,
        quality,
        setQuality,
        qualities,
        currentLevelIndex,
        onPlayToggle: togglePlay,
        onSeek: seek,
        onVolumeSeek,
        onMuteToggle,
        onFullscreenToggle: () => setFullscreen((value) => !value),
      }}
    >
      {children}
    </CustomVideoPlayerContext.Provider>
  );
}
