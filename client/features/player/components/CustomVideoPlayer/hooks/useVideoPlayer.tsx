"use client";

import Hls from "hls.js";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";

import { clampTime, createQualityOptions, getBufferedTime } from "../utils";

export interface VideoQuality {
  level: number;
  height: number;
  label: string;
}

export default function useVideoPlayer(videoRef: RefObject<HTMLVideoElement | null>, src?: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeline, setTimeline] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hlsRef = useRef<Hls | null>(null);
  const [qualities, setQualities] = useState<VideoQuality[]>([]);
  const [quality, setQualityState] = useState(-1);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(-1);
  const pendingQualityChangeRef = useRef<{ shouldResume: boolean; time: number } | null>(null);

  const syncBuffered = useCallback(() => {
    if (!videoRef.current) return;
    setBuffered(getBufferedTime(videoRef.current));
  }, [videoRef]);

  const syncDuration = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0);
  }, [videoRef]);

  const resumeAfterQualityChange = useCallback(async () => {
    const video = videoRef.current;
    const pendingChange = pendingQualityChangeRef.current;

    if (!video || !pendingChange) return;

    pendingQualityChangeRef.current = null;

    if (Math.abs(video.currentTime - pendingChange.time) > 1) {
      video.currentTime = clampTime(pendingChange.time, video.duration);
    }

    if (!pendingChange.shouldResume) return;

    try {
      await video.play();
    } catch {
      setIsPlaying(false);
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    let frameId = 0;

    if (!video) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = async () => {
      setIsLoading(false);
      setErrorMessage(null);
      syncDuration();
      await resumeAfterQualityChange();
    };
    const handleError = () => {
      setIsLoading(false);
      setErrorMessage("Video stream is unavailable");
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setTimeline(video.currentTime);
    const handleProgress = () => syncBuffered();
    const handleDurationChange = () => syncDuration();

    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("waiting", handleLoadStart);
    video.addEventListener("stalled", handleLoadStart);
    video.addEventListener("seeking", handleLoadStart);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("playing", handleCanPlay);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
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
      setIsLoading(video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("waiting", handleLoadStart);
      video.removeEventListener("stalled", handleLoadStart);
      video.removeEventListener("seeking", handleLoadStart);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("loadedmetadata", handleDurationChange);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("error", handleError);
    };
  }, [resumeAfterQualityChange, syncBuffered, syncDuration, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    let frameId = 0;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (!video || !src) {
      frameId = window.requestAnimationFrame(() => {
        setQualities([]);
        setQualityState(-1);
        setCurrentLevelIndex(-1);
        setIsLoading(false);
        setErrorMessage(null);
      });
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      setIsLoading(true);
      setErrorMessage(null);
      setQualities([]);
      setQualityState(-1);
      setCurrentLevelIndex(-1);
    });

    if (Hls.isSupported()) {
      const hls = new Hls({
        autoStartLoad: true,
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

      hls.on(Hls.Events.LEVEL_SWITCHING, () => {
        setIsLoading(true);
      });

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
            setIsLoading(false);
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
  }, [src, videoRef]);

  const setQuality = (level: number) => {
    const hls = hlsRef.current;
    const video = videoRef.current;

    if (!hls) {
      setQualityState(level);
      return;
    }

    pendingQualityChangeRef.current = {
      shouldResume: !!video && !video.paused && !video.ended,
      time: video?.currentTime || 0,
    };

    setIsLoading(true);
    setQualityState(level);

    hls.currentLevel = level;
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      try {
        await videoRef.current.play();
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    videoRef.current.pause();
  };

  const seek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = clampTime(time, video.duration);
    video.currentTime = nextTime;
    setTimeline(nextTime);
  };

  return {
    isPlaying,
    isLoading,
    timeline,
    buffered,
    duration,
    errorMessage,
    togglePlay,
    seek,
    qualities,
    quality,
    setQuality,
    currentLevelIndex,
  };
}
