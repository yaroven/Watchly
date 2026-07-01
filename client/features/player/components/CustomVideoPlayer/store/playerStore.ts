import { createStore } from "zustand";
import { RefObject } from "react";
import { VideoQuality } from "../types";
import { clampTime } from "../utils";

export interface PlayerStoreState {
  // State
  isPlaying: boolean;
  isInitialLoading: boolean;
  isBuffering: boolean;
  timeline: number;
  duration: number;
  buffered: number;
  errorMessage: string | null;
  isFullscreen: boolean;
  controlsVisible: boolean;
  quality: number;
  qualities: VideoQuality[];
  currentLevelIndex: number;

  // Refs
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;

  // Actions
  togglePlay: () => void | Promise<void>;
  seek: (time: number) => void;
  skip: (offset: number) => void;
  toggleFullscreen: () => void;
  setQuality: (level: number) => void;
}

export const createPlayerStore = (
  videoRef: RefObject<HTMLVideoElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
) => {
  return createStore<PlayerStoreState>((set, get) => ({
    // Initial State
    isPlaying: false,
    isInitialLoading: true,
    isBuffering: false,
    timeline: 0,
    duration: 0,
    buffered: 0,
    errorMessage: null,
    isFullscreen: false,
    controlsVisible: true,
    quality: -1,
    qualities: [],
    currentLevelIndex: -1,

    // Refs
    videoRef,
    containerRef,

    // Actions
    togglePlay: async () => {
      const video = videoRef.current;
      if (!video) return;

      if (video.paused) {
        try {
          await video.play();
        } catch {
          set({ isPlaying: false });
        }
        return;
      }

      video.pause();
    },

    seek: (time) => {
      const video = videoRef.current;
      if (!video) return;

      const nextTime = clampTime(time, video.duration);
      video.currentTime = nextTime;
      set({ timeline: nextTime });
    },

    skip: (offset) => {
      const video = videoRef.current;
      if (!video) return;

      const nextTime = clampTime(video.currentTime + offset, video.duration);
      video.currentTime = nextTime;
      set({ timeline: nextTime });
    },

    toggleFullscreen: () => {
      const container = containerRef.current;
      if (!container) return;

      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    },

    setQuality: (level) => {
      set({ quality: level });
    },
  }));
};

export type PlayerStore = ReturnType<typeof createPlayerStore>;
