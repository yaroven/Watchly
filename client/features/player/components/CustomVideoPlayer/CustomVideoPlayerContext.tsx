import { ChangeEvent, createContext, RefObject, useContext } from "react";

import { VideoQuality } from "./types";

export interface PlayerRefs {
  video: RefObject<HTMLVideoElement | null>;
  container: RefObject<HTMLDivElement | null>;
}

export interface PlayerPlayback {
  isPlaying: boolean;
  isInitialLoading: boolean;
  isBuffering: boolean;
  errorMessage: string | null;
  toggle: () => void | Promise<void>;
  seek: (time: number) => void;
  skip: (offset: number) => void;
}

export interface PlayerTimeline {
  current: number;
  duration: number;
  buffered: number;
}

export interface PlayerVolume {
  value: number;
  isMuted: boolean;
  set: (value: number | ((current: number) => number)) => void;
  seek: (e: ChangeEvent<HTMLInputElement>) => void;
  toggleMute: () => void;
}

export interface PlayerFullscreen {
  active: boolean;
  toggle: () => void;
}

export interface PlayerQuality {
  selected: number;
  options: VideoQuality[];
  currentLevel: number;
  set: (level: number) => void;
}

export interface PlayerPlaybackRate {
  value: number;
  options: readonly number[];
  set: (rate: number) => void;
  step: (direction: 1 | -1) => void;
}

export interface PlayerUI {
  controlsVisible: boolean;
}

export interface CustomVideoPlayerContextValue {
  refs: PlayerRefs;
  playback: PlayerPlayback;
  timeline: PlayerTimeline;
  volume: PlayerVolume;
  fullscreen: PlayerFullscreen;
  quality: PlayerQuality;
  playbackRate: PlayerPlaybackRate;
  ui: PlayerUI;
}

const CustomVideoPlayerContext = createContext<CustomVideoPlayerContextValue | null>(null);

export const useCustomVideoPlayer = () => {
  const context = useContext(CustomVideoPlayerContext);
  if (!context) {
    throw new Error("useCustomVideoPlayer must be used within a CustomVideoPlayerProvider");
  }
  return context;
};

export const usePlayerRefs = () => useCustomVideoPlayer().refs;
export const usePlayerPlayback = () => useCustomVideoPlayer().playback;
export const usePlayerTimeline = () => useCustomVideoPlayer().timeline;
export const usePlayerVolume = () => useCustomVideoPlayer().volume;
export const usePlayerFullscreen = () => useCustomVideoPlayer().fullscreen;
export const usePlayerQuality = () => useCustomVideoPlayer().quality;
export const usePlayerPlaybackRate = () => useCustomVideoPlayer().playbackRate;
export const usePlayerUI = () => useCustomVideoPlayer().ui;

export default CustomVideoPlayerContext;
