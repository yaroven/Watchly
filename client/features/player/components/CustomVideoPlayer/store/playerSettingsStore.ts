import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PLAYBACK_RATES, PlaybackRate } from "../constants";

interface PlayerSettingsState {
  volume: number;
  isMuted: boolean;
  previousVolume: number;
  playbackRate: PlaybackRate;
  setVolume: (value: number | ((curr: number) => number)) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  stepPlaybackRate: (direction: 1 | -1) => void;
}

export const usePlayerSettingsStore = create<PlayerSettingsState>()(
  persist(
    (set) => ({
      volume: 1.0,
      isMuted: false,
      previousVolume: 1.0,
      playbackRate: 1.0,
      setVolume: (value) =>
        set((state) => {
          const nextVolume = typeof value === "function" ? value(state.volume) : value;
          const clampedVolume = Math.min(Math.max(nextVolume, 0), 1);
          return {
            volume: clampedVolume,
            isMuted: clampedVolume === 0,
            previousVolume: clampedVolume > 0 ? clampedVolume : state.previousVolume,
          };
        }),
      setMuted: (isMuted) =>
        set((state) => ({
          isMuted,
          volume: isMuted ? 0 : state.previousVolume || 1.0,
        })),
      toggleMute: () =>
        set((state) => {
          if (state.isMuted || state.volume === 0) {
            const restoredVolume = state.previousVolume || 1.0;
            return {
              volume: restoredVolume,
              isMuted: false,
            };
          }
          return {
            previousVolume: state.volume,
            isMuted: true,
            volume: 0,
          };
        }),
      setPlaybackRate: (rate) =>
        set(() => {
          const valid = PLAYBACK_RATES.includes(rate as any) ? (rate as PlaybackRate) : 1.0;
          return { playbackRate: valid };
        }),
      stepPlaybackRate: (direction) =>
        set((state) => {
          const currentIndex = PLAYBACK_RATES.indexOf(state.playbackRate);
          const nextIndex = Math.min(
            Math.max(currentIndex + direction, 0),
            PLAYBACK_RATES.length - 1
          );
          return { playbackRate: PLAYBACK_RATES[nextIndex] };
        }),
    }),
    {
      name: "watchly-player-settings",
    }
  )
);
