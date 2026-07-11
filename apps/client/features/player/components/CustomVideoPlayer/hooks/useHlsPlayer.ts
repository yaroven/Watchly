"use client";

import Hls from "hls.js";
import { RefObject, useCallback, useEffect, useRef } from "react";
import { StoreApi } from "zustand";
import { PlayerStoreState } from "../store/playerStore";
import { createQualityOptions } from "../utils";

interface UseHlsPlayerOptions {
  beginSourceLoad: () => void;
  clearSource: () => void;
}

export default function useHlsPlayer(
  videoRef: RefObject<HTMLVideoElement | null>,
  src: string | undefined,
  store: StoreApi<PlayerStoreState>,
  { beginSourceLoad, clearSource }: UseHlsPlayerOptions,
) {
  const hlsRef = useRef<Hls | null>(null);

  const resetQualityState = useCallback(() => {
    store.setState({
      qualities: [],
      quality: -1,
      currentLevelIndex: -1,
    });
  }, [store]);

  const setQuality = useCallback(
    (level: number) => {
      const hls = hlsRef.current;

      if (!hls) {
        store.setState({ quality: level });
        return;
      }

      const isAuto = level === -1;
      const isAlreadySelected = isAuto ? hls.autoLevelEnabled : !hls.autoLevelEnabled && hls.loadLevel === level;

      if (isAlreadySelected) return;

      store.setState({ quality: level });
      hls.nextLevel = level;
      hls.loadLevel = level;
    },
    [store],
  );

  // Register setQuality action to the store
  useEffect(() => {
    store.setState({
      setQuality,
    } as Partial<PlayerStoreState>);
  }, [setQuality, store]);

  useEffect(() => {
    const video = videoRef.current;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (!video || !src) {
      const frameId = window.requestAnimationFrame(() => {
        resetQualityState();
        clearSource();
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    const frameId = window.requestAnimationFrame(() => {
      beginSourceLoad();
      resetQualityState();
    });

    if (Hls.isSupported()) {
      const hls = new Hls({
        autoStartLoad: true,
        startLevel: -1,
      });

      const syncQualityOptions = () => {
        store.setState({ qualities: createQualityOptions(hls.levels) });
      };

      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.loadSource(src);

      hls.on(Hls.Events.MANIFEST_LOADED, syncQualityOptions);
      hls.on(Hls.Events.MANIFEST_PARSED, syncQualityOptions);
      hls.on(Hls.Events.LEVELS_UPDATED, syncQualityOptions);

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        store.setState({
          currentLevelIndex: data.level,
          quality: hls.autoLevelEnabled ? -1 : data.level,
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            store.setState({ errorMessage: "Network error while loading video. Retrying..." });
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            store.setState({ errorMessage: "Playback error. Recovering..." });
            hls.recoverMediaError();
            break;
          default:
            store.setState({
              isInitialLoading: false,
              isBuffering: false,
              errorMessage: "Video stream is unavailable",
            });
            hls.destroy();
            hlsRef.current = null;
            break;
        }
      });

      return () => {
        window.cancelAnimationFrame(frameId);
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;

      return () => {
        window.cancelAnimationFrame(frameId);
        video.removeAttribute("src");
        video.load();
      };
    }

    return () => window.cancelAnimationFrame(frameId);
  }, [beginSourceLoad, clearSource, resetQualityState, src, videoRef, store]);
}
