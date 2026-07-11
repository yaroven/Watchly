"use client";

import { RefObject, useEffect, useRef } from "react";
import { StoreApi } from "zustand";
import { PlayerStoreState } from "../store/playerStore";

export default function useFullscreenMode(containerRef: RefObject<HTMLDivElement | null>, store: StoreApi<PlayerStoreState>) {
  const wasFullscreenRef = useRef(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;

      if (!active && wasFullscreenRef.current) {
        containerRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
      }

      wasFullscreenRef.current = active;
      store.setState({ isFullscreen: active });
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [containerRef, store]);
}
