"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

import PlayerControls from "./components/PlayerControls";
import PlayerOverlay from "./components/PlayerOverlay";
import VideoTapZones from "./components/VideoTapZones";
import styles from "./CustomVideoPlayer.module.scss";
import { usePlayerFullscreen, usePlayerPlayback, usePlayerRefs, usePlayerUI } from "./CustomVideoPlayerContext";
import CustomVideoPlayerProvider from "./CustomVideoPlayerProvider";
import ShortcutProvider from "./ShortcutsProvider";

function CustomVideoPlayerContent() {
  const { video, container } = usePlayerRefs();
  const { isPlaying, isInitialLoading, errorMessage, toggle, skip } = usePlayerPlayback();
  const { toggle: toggleFullscreen } = usePlayerFullscreen();
  const { controlsVisible } = usePlayerUI();

  const containerClassName = [styles.videoPlayerContainer, isInitialLoading && styles.isLoading, !controlsVisible && styles.hideCursor]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName} ref={container} tabIndex={0} aria-label="Video player">
      <video className={styles.videoPlayer} ref={video} playsInline preload="metadata" />
      <VideoTapZones onTap={toggle} onSkip={skip} onFullscreen={toggleFullscreen} />
      <PlayerOverlay isPlaying={isPlaying} isInitialLoading={isInitialLoading} errorMessage={errorMessage} onPlay={toggle} />
      <PlayerControls />
    </div>
  );
}

interface CustomVideoPlayerProps {
  src: string;
  onEnded?: () => void;
}

const CustomVideoPlayer = forwardRef<HTMLVideoElement, CustomVideoPlayerProps>(function CustomVideoPlayer({ src, onEnded }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement, []);

  return (
    <ShortcutProvider>
      <CustomVideoPlayerProvider videoRef={videoRef} src={src} onEnded={onEnded}>
        <CustomVideoPlayerContent />
      </CustomVideoPlayerProvider>
    </ShortcutProvider>
  );
});

export default CustomVideoPlayer;
