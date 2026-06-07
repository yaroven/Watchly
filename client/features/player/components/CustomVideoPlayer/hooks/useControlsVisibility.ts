"use client";

import { RefObject, useEffect, useEffectEvent, useRef, useState } from "react";

export default function useControlsVisibility(
  containerRef: RefObject<HTMLDivElement | null>,
  isPlaying: boolean,
) {
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  const clearControlsTimeout = useEffectEvent(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  });

  const revealControls = useEffectEvent(() => {
    setAreControlsVisible(true);
    clearControlsTimeout();

    if (isPlaying) {
      timeoutRef.current = window.setTimeout(() => setAreControlsVisible(false), 2500);
    }
  });

  useEffect(() => {
    if (!isPlaying) {
      if (!areControlsVisible) {
        queueMicrotask(() => setAreControlsVisible(true));
      }
      clearControlsTimeout();
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("mousemove", revealControls);
    el.addEventListener("click", revealControls);
    el.addEventListener("touchstart", revealControls, { passive: true });
    revealControls();

    return () => {
      el.removeEventListener("mousemove", revealControls);
      el.removeEventListener("click", revealControls);
      el.removeEventListener("touchstart", revealControls);
      clearControlsTimeout();
    };
  }, [areControlsVisible, containerRef, isPlaying]);

  return areControlsVisible;
}
