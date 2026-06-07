"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";

import { clampTime, getBufferedTime } from "../utils";

export default function useVideoElementEvents(
  videoRef: RefObject<HTMLVideoElement | null>,
  onEnded?: () => void,
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [timeline, setTimeline] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const seekTargetRef = useRef<number | null>(null);
  const hasPlayedRef = useRef(false);
  const onEndedRef = useRef(onEnded);

  onEndedRef.current = onEnded;

  const syncBuffered = useCallback(() => {
    if (!videoRef.current) return;
    setBuffered(getBufferedTime(videoRef.current));
  }, [videoRef]);

  const syncDuration = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0);
  }, [videoRef]);

  const resetSession = useCallback(() => {
    hasPlayedRef.current = false;
    seekTargetRef.current = null;
  }, []);

  const beginSourceLoad = useCallback(() => {
    resetSession();
    setIsInitialLoading(true);
    setIsBuffering(false);
    setErrorMessage(null);
    setTimeline(0);
  }, [resetSession]);

  const clearSource = useCallback(() => {
    resetSession();
    setIsInitialLoading(false);
    setIsBuffering(false);
    setErrorMessage(null);
    setTimeline(0);
  }, [resetSession]);

  useEffect(() => {
    const video = videoRef.current;
    let frameId = 0;

    if (!video) return;

    const handleLoadStart = () => {
      if (!hasPlayedRef.current) setIsInitialLoading(true);
    };
    const handleCanPlay = () => {
      setIsInitialLoading(false);
      setIsBuffering(false);
      setErrorMessage(null);
      syncDuration();
    };
    const handleError = () => {
      setIsInitialLoading(false);
      setIsBuffering(false);
      setErrorMessage("Video stream is unavailable");
    };
    const handlePlay = () => {
      hasPlayedRef.current = true;
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => onEndedRef.current?.();
    const handleWaiting = () => {
      if (hasPlayedRef.current) setIsBuffering(true);
    };
    const handlePlaying = () => {
      setIsInitialLoading(false);
      setIsBuffering(false);
      syncDuration();
    };
    const handleTimeUpdate = () => {
      if (seekTargetRef.current !== null) return;
      setTimeline(video.currentTime);
    };
    const handleSeeked = () => {
      const target = seekTargetRef.current;

      if (target !== null && Math.abs(video.currentTime - target) > 0.3) return;

      seekTargetRef.current = null;
      setTimeline(video.currentTime);
      setIsBuffering(false);
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
      setTimeline(video.currentTime || 0);
      syncBuffered();
      syncDuration();
      setIsPlaying(!video.paused);
      if (!hasPlayedRef.current) {
        setIsInitialLoading(video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA);
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
  }, [syncBuffered, syncDuration, videoRef]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    video.pause();
  }, [videoRef]);

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;

      const nextTime = clampTime(time, video.duration);
      seekTargetRef.current = nextTime;
      setTimeline(nextTime);
      if (hasPlayedRef.current) setIsBuffering(true);
      video.currentTime = nextTime;
    },
    [videoRef],
  );

  return {
    isPlaying,
    isInitialLoading,
    isBuffering,
    timeline,
    buffered,
    duration,
    errorMessage,
    setErrorMessage,
    setIsInitialLoading,
    setIsBuffering,
    togglePlay,
    seek,
    beginSourceLoad,
    clearSource,
  };
}
