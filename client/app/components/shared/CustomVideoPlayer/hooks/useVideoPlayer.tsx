"use client";

import Hls from "hls.js";
import { RefObject, useEffect, useRef, useState } from "react";

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

  // HLS State
  const hlsRef = useRef<Hls | null>(null);
  const [qualities, setQualities] = useState<VideoQuality[]>([]);
  const [quality, setQualityState] = useState<number>(-1); // -1 is Auto

  useEffect(() => {
    let hls: Hls;

    if (src && Hls.isSupported() && videoRef.current) {
      hls = new Hls({
        autoStartLoad: true,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const availableQualities: VideoQuality[] = data.levels.map((l, index) => ({
          level: index,
          height: l.height,
          label: `${l.height}p`,
        }));

        // Sort qualities by height in descending order (best to worst)
        availableQualities.sort((a, b) => b.height - a.height);

        // Prepend Auto option
        availableQualities.unshift({ level: -1, height: 0, label: "Auto" });
        setQualities(availableQualities);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (videoRef.current && src) {
      // Native HLS support (Safari)
      videoRef.current.src = src;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, videoRef]);

  const setQuality = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setQualityState(level);
    }
  };

  const togglePlay = () => {
    if (videoRef.current?.paused) videoRef.current.play();
    else videoRef.current?.pause();
  };

  const seek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setTimeline(time);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setTimeline(videoRef.current.currentTime);
  };

  const handleProgress = () => {
    if (videoRef.current) {
      const { buffered, currentTime } = videoRef.current;
      for (let i = 0; i < buffered.length; i++) {
        if (buffered.start(i) <= currentTime && buffered.end(i) >= currentTime) {
          setBuffered(buffered.end(i));
          break;
        }
      }
    }
  };

  return {
    isPlaying,
    setIsPlaying,
    isLoading,
    setIsLoading,
    timeline,
    buffered,
    togglePlay,
    seek,
    handleTimeUpdate,
    handleProgress,
    qualities,
    quality,
    setQuality,
  };
}
