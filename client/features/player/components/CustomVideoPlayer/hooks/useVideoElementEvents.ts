"use client";

import { parseAsInteger, useQueryState } from "nuqs";
import { RefObject, useCallback, useEffect, useRef } from "react";
import { StoreApi } from "zustand";
import { PlayerStoreState } from "../store/playerStore";
import { clampTime, getBufferedTime } from "../utils";

export default function useVideoElementEvents(
  videoRef: RefObject<HTMLVideoElement | null>,
  store: StoreApi<PlayerStoreState>,
  onEnded?: () => void,
) {
  const [urlTime, setUrlTime] = useQueryState(
    "t",
    parseAsInteger.withDefault(0).withOptions({
      shallow: true,
      history: "replace",
      throttleMs: 1000,
      scroll: false,
    }),
  );

  const seekTargetRef = useRef<number | null>(null);
  const hasPlayedRef = useRef(false);
  const hasSeekedInitialTimeRef = useRef(false);
  const onEndedRef = useRef(onEnded);

  onEndedRef.current = onEnded;

  const syncBuffered = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    store.setState({ buffered: getBufferedTime(video) });
  }, [videoRef, store]);

  const syncDuration = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    store.setState({
      duration: Number.isFinite(video.duration) ? video.duration : 0,
    });
  }, [videoRef, store]);

  const resetSession = useCallback(() => {
    hasPlayedRef.current = false;
    seekTargetRef.current = null;
    hasSeekedInitialTimeRef.current = false;
  }, []);

  const beginSourceLoad = useCallback(() => {
    resetSession();
    store.setState({
      isInitialLoading: true,
      isBuffering: false,
      errorMessage: null,
      timeline: 0,
    });
  }, [resetSession, store]);

  const clearSource = useCallback(() => {
    resetSession();
    store.setState({
      isInitialLoading: false,
      isBuffering: false,
      errorMessage: null,
      timeline: 0,
    });
  }, [resetSession, store]);

  useEffect(() => {
    const video = videoRef.current;
    let frameId = 0;

    if (!video) return;

    const handleLoadStart = () => {
      if (!hasPlayedRef.current) {
        store.setState({ isInitialLoading: true });
      }
    };

    const handleCanPlay = () => {
      store.setState({
        isInitialLoading: false,
        isBuffering: false,
        errorMessage: null,
      });
      syncDuration();

      // Seek to initial time from URL query if it's the first time loading this video source
      if (!hasSeekedInitialTimeRef.current) {
        hasSeekedInitialTimeRef.current = true;
        const initialTime = urlTime;
        if (initialTime > 0) {
          const target = clampTime(initialTime, video.duration || 0);
          video.currentTime = target;
          store.setState({ timeline: target });
        }
      }
    };

    const handleError = () => {
      store.setState({
        isInitialLoading: false,
        isBuffering: false,
        errorMessage: "Video stream is unavailable",
      });
    };

    const handlePlay = () => {
      hasPlayedRef.current = true;
      store.setState({ isPlaying: true });
    };

    const handlePause = () => {
      store.setState({ isPlaying: false });
    };

    const handleEnded = () => {
      onEndedRef.current?.();
    };

    const handleWaiting = () => {
      if (hasPlayedRef.current) {
        store.setState({ isBuffering: true });
      }
    };

    const handlePlaying = () => {
      store.setState({
        isInitialLoading: false,
        isBuffering: false,
      });
      syncDuration();
    };

    const handleTimeUpdate = () => {
      if (seekTargetRef.current !== null) return;
      const currentTime = video.currentTime;
      store.setState({ timeline: currentTime });

      // Update URL query parameter 't' with the current playback time during playback
      if (!video.paused) {
        void setUrlTime(Math.floor(currentTime));
      }
    };

    const handleSeeked = () => {
      const target = seekTargetRef.current;

      if (target !== null && Math.abs(video.currentTime - target) > 0.3) return;

      seekTargetRef.current = null;
      const currentTime = video.currentTime;
      store.setState({
        timeline: currentTime,
        isBuffering: false,
      });

      // Instantly sync URL parameter upon manual seek
      void setUrlTime(Math.floor(currentTime));
    };

    const handleProgress = () => syncBuffered();
    const handleDurationChange = () => syncDuration();

    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("stalled", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("loadedmetadata", handleDurationChange);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("error", handleError);

    frameId = window.requestAnimationFrame(() => {
      const currentTime = video.currentTime || 0;
      store.setState({
        timeline: currentTime,
        isPlaying: !video.paused,
      });
      syncBuffered();
      syncDuration();
      if (!hasPlayedRef.current) {
        store.setState({
          isInitialLoading: video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA,
        });
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("stalled", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("loadedmetadata", handleDurationChange);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("error", handleError);
    };
  }, [syncBuffered, syncDuration, videoRef, store, urlTime, setUrlTime]);

  return {
    beginSourceLoad,
    clearSource,
  };
}
