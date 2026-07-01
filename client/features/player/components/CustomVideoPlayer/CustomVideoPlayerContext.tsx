"use client";

import { ChangeEvent, createContext, useContext } from "react";
import { StoreApi, useStore } from "zustand";
import { PLAYBACK_RATES } from "./constants";
import { usePlayerSettingsStore } from "./store/playerSettingsStore";
import { PlayerStoreState } from "./store/playerStore";

export const PlayerStoreContext = createContext<StoreApi<PlayerStoreState> | null>(null);

export const usePlayerStore = () => {
  const store = useContext(PlayerStoreContext);
  if (!store) {
    throw new Error("usePlayerStore must be used within a CustomVideoPlayerProvider");
  }
  return store;
};

export const usePlayerRefs = () => {
  const store = usePlayerStore();
  const video = useStore(store, (s) => s.videoRef);
  const container = useStore(store, (s) => s.containerRef);
  return { video, container };
};

export const usePlayerPlayback = () => {
  const store = usePlayerStore();
  const isPlaying = useStore(store, (s) => s.isPlaying);
  const isInitialLoading = useStore(store, (s) => s.isInitialLoading);
  const isBuffering = useStore(store, (s) => s.isBuffering);
  const errorMessage = useStore(store, (s) => s.errorMessage);
  const toggle = useStore(store, (s) => s.togglePlay);
  const seek = useStore(store, (s) => s.seek);
  const skip = useStore(store, (s) => s.skip);

  return {
    isPlaying,
    isInitialLoading,
    isBuffering,
    errorMessage,
    toggle,
    seek,
    skip,
  };
};

export const usePlayerTimeline = () => {
  const store = usePlayerStore();
  const current = useStore(store, (s) => s.timeline);
  const duration = useStore(store, (s) => s.duration);
  const buffered = useStore(store, (s) => s.buffered);

  return { current, duration, buffered };
};

export const usePlayerVolume = () => {
  const volume = usePlayerSettingsStore((s) => s.volume);
  const isMuted = usePlayerSettingsStore((s) => s.isMuted);
  const set = usePlayerSettingsStore((s) => s.setVolume);
  const toggleMute = usePlayerSettingsStore((s) => s.toggleMute);

  return {
    value: volume,
    isMuted,
    set,
    seek: (e: ChangeEvent<HTMLInputElement>) => {
      set(parseFloat(e.target.value));
    },
    toggleMute,
  };
};

export const usePlayerFullscreen = () => {
  const store = usePlayerStore();
  const active = useStore(store, (s) => s.isFullscreen);
  const toggle = useStore(store, (s) => s.toggleFullscreen);

  return { active, toggle };
};

export const usePlayerQuality = () => {
  const store = usePlayerStore();
  const selected = useStore(store, (s) => s.quality);
  const options = useStore(store, (s) => s.qualities);
  const currentLevel = useStore(store, (s) => s.currentLevelIndex);
  const set = useStore(store, (s) => s.setQuality);

  return { selected, options, currentLevel, set };
};

export const usePlayerPlaybackRate = () => {
  const value = usePlayerSettingsStore((s) => s.playbackRate);
  const set = usePlayerSettingsStore((s) => s.setPlaybackRate);
  const step = usePlayerSettingsStore((s) => s.stepPlaybackRate);

  return {
    value,
    options: PLAYBACK_RATES,
    set,
    step,
  };
};

export const usePlayerUI = () => {
  const store = usePlayerStore();
  const controlsVisible = useStore(store, (s) => s.controlsVisible);

  return { controlsVisible };
};
