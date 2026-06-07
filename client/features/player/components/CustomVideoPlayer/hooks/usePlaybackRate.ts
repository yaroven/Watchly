"use client";

import { useCallback, useState } from "react";

import { PLAYBACK_RATES, PLAYBACK_RATE_STORAGE_KEY, PlaybackRate } from "../constants";

function toPlaybackRate(rate: number): PlaybackRate {
  return (PLAYBACK_RATES as readonly number[]).includes(rate) ? (rate as PlaybackRate) : 1;
}

function readStoredRate(): PlaybackRate {
  if (typeof window === "undefined") return 1;

  const stored = localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY);
  if (!stored) return 1;

  return toPlaybackRate(parseFloat(stored));
}

function persistRate(rate: PlaybackRate) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(rate));
}

export default function usePlaybackRate() {
  const [rate, setRateState] = useState<PlaybackRate>(readStoredRate);

  const set = useCallback((nextRate: number) => {
    const value = toPlaybackRate(nextRate);
    setRateState(value);
    persistRate(value);
  }, []);

  const step = useCallback((direction: 1 | -1) => {
    setRateState((current) => {
      const currentIndex = PLAYBACK_RATES.indexOf(current);
      const nextIndex = Math.min(
        Math.max(currentIndex + direction, 0),
        PLAYBACK_RATES.length - 1,
      );
      const value = PLAYBACK_RATES[nextIndex];
      persistRate(value);
      return value;
    });
  }, []);

  return {
    rate,
    options: PLAYBACK_RATES,
    set,
    step,
  };
}
