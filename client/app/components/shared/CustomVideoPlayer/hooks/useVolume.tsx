"use client";

import { ChangeEvent, useState } from "react";

export default function useVolume() {
  const [isMuted, setIsMuted] = useState(false);
  const [volumeValue, setVolumeValue] = useState(1);
  const onVolumeSeek = (e: ChangeEvent<HTMLInputElement>) => {
    setVolumeValue(parseFloat(e.target.value));
    setIsMuted(false);
  };
  const onMuteToggle = () => setIsMuted((value) => !value);
  return {
    onMuteToggle,
    isMuted,
    volumeValue,
    onVolumeSeek,
    setVolume: setVolumeValue,
  };
}
