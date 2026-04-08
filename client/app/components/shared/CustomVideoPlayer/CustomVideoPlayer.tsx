"use client";

import { LoaderCircle, PlayIcon } from "lucide-react";
import { ComponentProps, useImperativeHandle, useRef } from "react";
import styles from "./CustomVideoPlayer.module.scss";
import { useCustomVideoPlayer } from "./CustomVideoPlayerContext";
import CustomVideoPlayerProvider from "./CustomVideoPlayerProvider";
import PlayerControls from "./components/PlayerControls";

function CustomVideoPlayerContent() {
  const {
    videoRef,
    videoContainerRef,
    isPlaying,
    setIsPlaying,
    isLoading,
    setIsLoading,
    isFullscreen,
    areControlsVisible,
    onPlayToggle,
    handleTimeUpdate,
    handleProgress,
    onSeek,
    onFullscreenToggle,
  } = useCustomVideoPlayer();

  const handleLeftDblClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      onSeek(Math.max(videoRef.current.currentTime - 10, 0));
    }
  };

  const handleRightDblClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      onSeek(Math.min(videoRef.current.currentTime + 10, videoRef.current.duration || 0));
    }
  };

  const handleCenterDblClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFullscreenToggle();
  };

  const handleCanPlayThrough = () => setIsLoading(false);
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  return (
    <div
      className={`${styles.videoPlayerContainer} ${isLoading && styles.isLoading} ${!areControlsVisible && styles.hideCursor}`}
      ref={videoContainerRef}
    >
      <video
        className={`${styles.videoPlayer} ${isFullscreen && styles.fullscreen}`}
        ref={videoRef}
        onCanPlayThrough={handleCanPlayThrough}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
      />
      <div className={styles.doubleClickLayer}>
        <div className={styles.dcLeft} onClick={onPlayToggle} onDoubleClick={handleLeftDblClick} />
        <div
          className={styles.dcCenter}
          onClick={onPlayToggle}
          onDoubleClick={handleCenterDblClick}
        />
        <div
          className={styles.dcRight}
          onClick={onPlayToggle}
          onDoubleClick={handleRightDblClick}
        />
      </div>
      {!isPlaying && !isLoading && (
        <PlayIcon onClick={onPlayToggle} className={styles.playIcon} size={64} />
      )}
      {isLoading && <LoaderCircle className={styles.loader} size={64} />}
      <PlayerControls />
    </div>
  );
}

export default function CustomVideoPlayer({ ref, src }: ComponentProps<"video">) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => videoRef.current!);

  return (
    <CustomVideoPlayerProvider videoRef={videoRef} src={src as string}>
      <CustomVideoPlayerContent />
    </CustomVideoPlayerProvider>
  );
}
