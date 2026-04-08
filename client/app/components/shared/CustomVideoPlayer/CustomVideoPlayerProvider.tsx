"use client";

import useVideoPlayer from "@/app/components/shared/CustomVideoPlayer/hooks/useVideoPlayer";
import useVolume from "@/app/components/shared/CustomVideoPlayer/hooks/useVolume";
import { ReactNode, RefObject, useEffect, useRef, useState } from "react";
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
    setIsPlaying,
    isLoading,
    setIsLoading,
    timeline,
    buffered,
    togglePlay,
    seek,
    handleTimeUpdate,
    handleProgress,
    qualities,
    quality,
    setQuality,
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
        videoContainerRef.current?.requestFullscreen();
      }
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.code === "Space" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m" || e.key === "M") {
        if (e.repeat) return;
        e.preventDefault();
        onMuteToggle();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setFullscreen((prev) => !prev);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (videoRef.current) {
          seek(Math.max(videoRef.current.currentTime - 5, 0));
        }
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (videoRef.current) {
          seek(Math.min(videoRef.current.currentTime + 5, videoRef.current.duration || 0));
        }
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        setVolume((v) => Math.min(v + 0.1, 1));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        setVolume((v) => Math.max(v - 0.1, 0));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, seek, setVolume, videoRef, onMuteToggle]);

  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onUserInteraction = () => {
      setAreControlsVisible(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (isPlaying) {
        timeoutRef.current = setTimeout(() => {
          setAreControlsVisible(false);
        }, 2500);
      }
    };

    if (!isPlaying) {
      if (!areControlsVisible) setTimeout(() => setAreControlsVisible(true), 0);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const el = videoContainerRef.current;
    if (el) {
      el.addEventListener("mousemove", onUserInteraction);
      el.addEventListener("click", onUserInteraction);
    }
    onUserInteraction();

    return () => {
      if (el) {
        el.removeEventListener("mousemove", onUserInteraction);
        el.removeEventListener("click", onUserInteraction);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying, videoContainerRef, areControlsVisible]);

  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => setDuration(video.duration);
    video.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [videoRef]);

  return (
    <CustomVideoPlayerContext.Provider
      value={{
        videoRef,
        videoContainerRef,
        isPlaying,
        areControlsVisible,
        setIsPlaying,
        isLoading,
        setIsLoading,
        timeline,
        buffered,
        handleTimeUpdate,
        handleProgress,
        duration,
        volumeValue,
        isMuted,
        isFullscreen,
        quality,
        setQuality,
        qualities,
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
