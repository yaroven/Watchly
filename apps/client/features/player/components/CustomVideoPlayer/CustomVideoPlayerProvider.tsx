"use client";

import { ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { PlayerStoreContext } from "./CustomVideoPlayerContext";
import useControlsVisibility from "./hooks/useControlsVisibility";
import useFullscreenMode from "./hooks/useFullscreenMode";
import usePlayerKeyboard from "./hooks/usePlayerKeyboard";
import useVideoPlayer from "./hooks/useVideoPlayer";
import { usePlayerSettingsStore } from "./store/playerSettingsStore";
import { createPlayerStore } from "./store/playerStore";

interface CustomVideoPlayerProviderProps {
  children: ReactNode;
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  onEnded?: () => void;
}

export default function CustomVideoPlayerProvider({ children, videoRef, src, onEnded }: CustomVideoPlayerProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize per-instance store once
  // eslint-disable-next-line react-hooks/refs
  const [store] = useState(() => createPlayerStore(videoRef, containerRef));
  // Retrieve global persistent player settings
  const volume = usePlayerSettingsStore((s) => s.volume);
  const isMuted = usePlayerSettingsStore((s) => s.isMuted);
  const playbackRate = usePlayerSettingsStore((s) => s.playbackRate);
  const volumeStore = usePlayerSettingsStore();

  // Setup video events, HLS, fullscreen, and visibility
  useVideoPlayer(videoRef, src, store, onEnded);
  useFullscreenMode(containerRef, store);

  const isPlaying = useStore(store, (s) => s.isPlaying);
  const controlsVisible = useControlsVisibility(containerRef, isPlaying);

  // Synchronize controls visibility to store
  useEffect(() => {
    store.setState({ controlsVisible });
  }, [controlsVisible, store]);

  // Synchronize global settings from store to HTMLVideoElement
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume;
    video.muted = isMuted;
    video.playbackRate = playbackRate;
  }, [volume, isMuted, playbackRate, videoRef]);

  // Setup keyboard controls
  usePlayerKeyboard({
    videoRef,
    containerRef,
    togglePlay: () => store.getState().togglePlay(),
    seek: (time) => store.getState().seek(time),
    toggleMute: volumeStore.toggleMute,
    setVolume: volumeStore.setVolume,
    stepPlaybackRate: volumeStore.stepPlaybackRate,
    toggleFullscreen: () => store.getState().toggleFullscreen(),
  });

  return <PlayerStoreContext.Provider value={store}>{children}</PlayerStoreContext.Provider>;
}
