"use client";

import { RefObject, useEffect } from "react";
import { TimelineShortcutSeek, VolumeShortcutSeek } from "../constants";
import useShortcuts from "./useShortcuts";

interface UsePlayerKeyboardOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
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
  const { register, unregister } = useShortcuts();
  useEffect(() => {
    register({ key: "Space" }, () => togglePlay());
    register({ key: "m" }, (event) => {
      if (!event.repeat) toggleMute();
    });
    register({ key: "f" }, () => toggleFullscreen());
    register({ key: "ArrowLeft", modifiers: ["Shift"] }, () => stepPlaybackRate(-1));
    register({ key: "ArrowRight", modifiers: ["Shift"] }, () => stepPlaybackRate(1));
    register({ key: "ArrowLeft" }, () => {
      if (videoRef.current) seek(videoRef.current.currentTime - TimelineShortcutSeek);
    });
    register({ key: "ArrowRight" }, () => {
      if (videoRef.current) seek(videoRef.current.currentTime + TimelineShortcutSeek);
    });
    register({ key: "ArrowUp" }, () => setVolume((value) => value + VolumeShortcutSeek));
    register({ key: "ArrowDown" }, () => setVolume((value) => value - VolumeShortcutSeek));

    return () => {
      unregister({ key: "Space" });
      unregister({ key: "m" });
      unregister({ key: "f" });
      unregister({ key: "ArrowLeft", modifiers: ["Shift"] });
      unregister({ key: "ArrowRight", modifiers: ["Shift"] });
      unregister({ key: "ArrowLeft" });
      unregister({ key: "ArrowRight" });
      unregister({ key: "ArrowUp" });
      unregister({ key: "ArrowDown" });
    };
  }, [register, seek, setVolume, stepPlaybackRate, toggleFullscreen, toggleMute, togglePlay, unregister, videoRef]);
}
