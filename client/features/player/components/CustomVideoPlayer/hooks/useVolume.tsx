"use client";

import { ChangeEvent, useRef, useState } from "react";

export default function useVolume() {
  const [isMuted, setIsMuted] = useState(false);
  const [volumeValue, setVolumeValue] = useState(1);
  const previousVolumeRef = useRef(1);

  const onVolumeSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const nextVolume = parseFloat(e.target.value);

    setVolumeValue(nextVolume);
    setIsMuted(nextVolume === 0);

    if (nextVolume > 0) {
      previousVolumeRef.current = nextVolume;
    }
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
    setVolume: setVolumeValue,
  };
}
