"use client";

import { LoaderCircle, PlayIcon } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef } from "react";

import styles from "./CustomVideoPlayer.module.scss";
import { useCustomVideoPlayer } from "./CustomVideoPlayerContext";
import CustomVideoPlayerProvider from "./CustomVideoPlayerProvider";
import PlayerControls from "./components/PlayerControls";
import { clampTime } from "./utils";

function CustomVideoPlayerContent() {
  const {
    videoRef,
    videoContainerRef,
    isPlaying,
    isLoading,
    errorMessage,
    areControlsVisible,
    onPlayToggle,
    onSeek,
    onFullscreenToggle,
  } = useCustomVideoPlayer();

  const skipBy = (offset: number) => {
    const video = videoRef.current;
    if (!video) return;

    onSeek(clampTime(video.currentTime + offset, video.duration || 0));
  };

  const handleLeftDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    skipBy(-10);
  };

  const handleRightDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    skipBy(10);
  };

  const handleCenterDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFullscreenToggle();
  };

  return (
    <div
      className={`${styles.videoPlayerContainer} ${isLoading && styles.isLoading} ${!areControlsVisible && styles.hideCursor}`}
      ref={videoContainerRef}
    >
      <video
        className={styles.videoPlayer}
        ref={videoRef}
        playsInline
        preload="metadata"
      />
      <div className={styles.doubleClickLayer}>
        <div
          className={styles.dcLeft}
          onClick={onPlayToggle}
          onDoubleClick={handleLeftDoubleClick}
        />
        <div
          className={styles.dcCenter}
          onClick={onPlayToggle}
          onDoubleClick={handleCenterDoubleClick}
        />
        <div
          className={styles.dcRight}
          onClick={onPlayToggle}
          onDoubleClick={handleRightDoubleClick}
        />
      </div>
      {!isPlaying && !isLoading && !errorMessage && (
        <button
          type="button"
          onClick={onPlayToggle}
          className={styles.centerPlayButton}
          aria-label="Play video"
        >
          <PlayIcon size={64} />
        </button>
      )}
      {isLoading && !errorMessage && <LoaderCircle className={styles.loader} size={64} />}
      {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}
      <PlayerControls />
    </div>
  );
}

interface CustomVideoPlayerProps {
  src: string;
}

const CustomVideoPlayer = forwardRef<HTMLVideoElement, CustomVideoPlayerProps>(
  function CustomVideoPlayer({ src }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement, []);

    return (
      <CustomVideoPlayerProvider videoRef={videoRef} src={src}>
        <CustomVideoPlayerContent />
      </CustomVideoPlayerProvider>
    );
  },
);

export default CustomVideoPlayer;
