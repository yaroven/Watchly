"use client";

import Hls from "hls.js";
import { RefObject, useCallback, useEffect, useRef } from "react";
import { StoreApi } from "zustand";
import { type FatalHlsError, nextHlsRecovery } from "../../../lib/hls-recovery";
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

      let recoveries = 0;
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        recoveries = 0;
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        const error: FatalHlsError =
          data.type === Hls.ErrorTypes.NETWORK_ERROR ? "network" : data.type === Hls.ErrorTypes.MEDIA_ERROR ? "media" : "other";
        const recovery = nextHlsRecovery(error, recoveries);
        recoveries += 1;

        if (recovery === "restart-load") {
          store.setState({ errorKey: "networkRetrying" });
          hls.startLoad();
        } else if (recovery === "recover-media") {
          store.setState({ errorKey: "playbackRecovering" });
          hls.recoverMediaError();
        } else {
          store.setState({ isInitialLoading: false, isBuffering: false, errorKey: "streamUnavailable" });
          hls.destroy();
          hlsRef.current = null;
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
