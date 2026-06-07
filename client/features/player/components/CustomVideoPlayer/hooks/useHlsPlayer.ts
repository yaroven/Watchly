"use client";

import Hls from "hls.js";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";

import { VideoQuality } from "../types";
import { createQualityOptions } from "../utils";

interface UseHlsPlayerOptions {
  beginSourceLoad: () => void;
  clearSource: () => void;
  setErrorMessage: (message: string | null) => void;
  setIsInitialLoading: (value: boolean) => void;
  setIsBuffering: (value: boolean) => void;
}

export default function useHlsPlayer(
  videoRef: RefObject<HTMLVideoElement | null>,
  src: string | undefined,
  { beginSourceLoad, clearSource, setErrorMessage, setIsInitialLoading, setIsBuffering }: UseHlsPlayerOptions,
) {
  const hlsRef = useRef<Hls | null>(null);
  const [qualities, setQualities] = useState<VideoQuality[]>([]);
  const [quality, setQualityState] = useState(-1);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(-1);

  const resetQualityState = useCallback(() => {
    setQualities([]);
    setQualityState(-1);
    setCurrentLevelIndex(-1);
  }, []);

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
        setQualities(createQualityOptions(hls.levels));
      };

      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.loadSource(src);

      hls.on(Hls.Events.MANIFEST_LOADED, syncQualityOptions);
      hls.on(Hls.Events.MANIFEST_PARSED, syncQualityOptions);
      hls.on(Hls.Events.LEVELS_UPDATED, syncQualityOptions);

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevelIndex(data.level);
        setQualityState(hls.autoLevelEnabled ? -1 : data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            setErrorMessage("Network error while loading video. Retrying...");
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            setErrorMessage("Playback error. Recovering...");
            hls.recoverMediaError();
            break;
          default:
            setIsInitialLoading(false);
            setIsBuffering(false);
            setErrorMessage("Video stream is unavailable");
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
  }, [
    beginSourceLoad,
    clearSource,
    resetQualityState,
    setErrorMessage,
    setIsBuffering,
    setIsInitialLoading,
    src,
    videoRef,
  ]);

  const setQuality = useCallback((level: number) => {
    const hls = hlsRef.current;

    if (!hls) {
      setQualityState(level);
      return;
    }

    const isAuto = level === -1;
    const isAlreadySelected = isAuto
      ? hls.autoLevelEnabled
      : !hls.autoLevelEnabled && hls.loadLevel === level;

    if (isAlreadySelected) return;

    setQualityState(level);
    hls.nextLevel = level;
    hls.loadLevel = level;
  }, []);

  return {
    qualities,
    quality,
    setQuality,
    currentLevelIndex,
  };
}
