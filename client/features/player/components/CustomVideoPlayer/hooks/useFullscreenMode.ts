"use client";

import { RefObject, useEffect, useRef, useState } from "react";

export default function useFullscreenMode(containerRef: RefObject<HTMLDivElement | null>) {
  const [isFullscreen, setFullscreen] = useState(false);
  const wasFullscreenRef = useRef(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;

      if (!active && wasFullscreenRef.current) containerRef.current?.scrollIntoView({ block: "center", behavior: "auto" });

      wasFullscreenRef.current = active;
      setFullscreen(active);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [containerRef]);

  useEffect(() => {
    if (isFullscreen) {
      if (!document.fullscreenElement) void containerRef.current?.requestFullscreen();
      return;
    }

    if (document.fullscreenElement) void document.exitFullscreen();
  }, [containerRef, isFullscreen]);

  const toggle = () => setFullscreen((value) => !value);

  return { isFullscreen, toggle };
}
