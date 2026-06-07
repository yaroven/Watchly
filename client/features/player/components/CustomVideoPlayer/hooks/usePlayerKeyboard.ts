"use client";

import { RefObject, useEffect, useEffectEvent } from "react";

interface UsePlayerKeyboardOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  togglePlay: () => void | Promise<void>;
  seek: (time: number) => void;
  toggleMute: () => void;
  setVolume: (value: number | ((current: number) => number)) => void;
  stepPlaybackRate: (direction: 1 | -1) => void;
  toggleFullscreen: () => void;
}

export default function usePlayerKeyboard({
  videoRef,
  togglePlay,
  seek,
  toggleMute,
  setVolume,
  stepPlaybackRate,
  toggleFullscreen,
}: UsePlayerKeyboardOptions) {
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
      toggleMute();
      return;
    }

    if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    if (e.key === "<" || (e.shiftKey && e.key === ",")) {
      e.preventDefault();
      stepPlaybackRate(-1);
      return;
    }

    if (e.key === ">" || (e.shiftKey && e.key === ".")) {
      e.preventDefault();
      stepPlaybackRate(1);
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
}
