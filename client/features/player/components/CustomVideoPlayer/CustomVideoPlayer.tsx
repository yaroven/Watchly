"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

import styles from "./CustomVideoPlayer.module.scss";
import {
  usePlayerFullscreen,
  usePlayerPlayback,
  usePlayerRefs,
  usePlayerUI,
} from "./CustomVideoPlayerContext";
import CustomVideoPlayerProvider from "./CustomVideoPlayerProvider";
import PlayerControls from "./components/PlayerControls";
import PlayerOverlay from "./components/PlayerOverlay";
import VideoTapZones from "./components/VideoTapZones";

function CustomVideoPlayerContent() {
  const { video, container } = usePlayerRefs();
  const { isPlaying, isInitialLoading, errorMessage, toggle, skip } = usePlayerPlayback();
  const { toggle: toggleFullscreen } = usePlayerFullscreen();
  const { controlsVisible } = usePlayerUI();

  const containerClassName = [
    styles.videoPlayerContainer,
    isInitialLoading && styles.isLoading,
    !controlsVisible && styles.hideCursor,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName} ref={container}>
      <video className={styles.videoPlayer} ref={video} playsInline preload="metadata" />
      <VideoTapZones onTap={toggle} onSkip={skip} onFullscreen={toggleFullscreen} />
      <PlayerOverlay
        isPlaying={isPlaying}
        isInitialLoading={isInitialLoading}
        errorMessage={errorMessage}
        onPlay={toggle}
      />
      <PlayerControls />
    </div>
  );
}

interface CustomVideoPlayerProps {
  src: string;
  onEnded?: () => void;
}

const CustomVideoPlayer = forwardRef<HTMLVideoElement, CustomVideoPlayerProps>(
  function CustomVideoPlayer({ src, onEnded }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement, []);

    return (
      <CustomVideoPlayerProvider videoRef={videoRef} src={src} onEnded={onEnded}>
        <CustomVideoPlayerContent />
      </CustomVideoPlayerProvider>
    );
  },
);

export default CustomVideoPlayer;
