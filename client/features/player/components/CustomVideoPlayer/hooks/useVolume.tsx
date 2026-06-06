"use client";

import { ChangeEvent, useRef, useState } from "react";

export default function useVolume() {
  const [isMuted, setIsMuted] = useState(false);
  const [volumeValue, setVolumeValue] = useState(1);
  const previousVolumeRef = useRef(1);

  const setVolume = (value: number | ((currentValue: number) => number)) => {
    setVolumeValue((currentValue) => {
      const nextVolume = typeof value === "function" ? value(currentValue) : value;
      const clampedVolume = Math.min(Math.max(nextVolume, 0), 1);

      setIsMuted(clampedVolume === 0);

      if (clampedVolume > 0) {
        previousVolumeRef.current = clampedVolume;
      }

      return clampedVolume;
    });
  };

  const onVolumeSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const nextVolume = parseFloat(e.target.value);
    setVolume(nextVolume);
  };

  const onMuteToggle = () => {
    if (isMuted || volumeValue === 0) {
      const restoredVolume = previousVolumeRef.current || 1;
      setVolumeValue(restoredVolume);
      setIsMuted(false);
      return;
    }

    previousVolumeRef.current = volumeValue;
    setIsMuted(true);
  };

  return {
    onMuteToggle,
    isMuted,
    volumeValue,
    onVolumeSeek,
    setVolume,
  };
}
