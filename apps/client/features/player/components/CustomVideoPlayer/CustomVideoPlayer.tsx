"use client";

import Box from "@mui/material/Box";
import { forwardRef, useImperativeHandle, useRef } from "react";

import PlayerControls from "./components/PlayerControls";
import PlayerOverlay from "./components/PlayerOverlay";
import VideoTapZones from "./components/VideoTapZones";
import { usePlayerFullscreen, usePlayerPlayback, usePlayerRefs, usePlayerUI } from "./CustomVideoPlayerContext";
import CustomVideoPlayerProvider from "./CustomVideoPlayerProvider";
import ShortcutProvider from "./ShortcutsProvider";

function CustomVideoPlayerContent() {
  const { video, container } = usePlayerRefs();
  const { isPlaying, isInitialLoading, errorMessage, toggle, skip } = usePlayerPlayback();
  const { toggle: toggleFullscreen } = usePlayerFullscreen();
  const { controlsVisible } = usePlayerUI();

  return (
    <Box
      ref={container}
      tabIndex={0}
      aria-label="Video player"
      sx={[
        {
          backgroundColor: "#000",
          position: "relative",
          width: "100%",
          maxWidth: "100%",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          aspectRatio: "16 / 9",
        },
        isInitialLoading && {
          backgroundColor: "#1a1a1a",
          background: "linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)",
          backgroundSize: "200% 100%",
          width: "100%",
          animation: "shimmer 1.5s infinite",
          "@keyframes shimmer": {
            "0%": { backgroundPosition: "200% 0" },
            "100%": { backgroundPosition: "-200% 0" },
          },
        },
        !controlsVisible && { cursor: "none" },
      ]}
    >
      <Box
        component="video"
        ref={video}
        playsInline
        preload="metadata"
        sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
      <VideoTapZones onTap={toggle} onSkip={skip} onFullscreen={toggleFullscreen} />
      <PlayerOverlay isPlaying={isPlaying} isInitialLoading={isInitialLoading} errorMessage={errorMessage} onPlay={toggle} />
      <PlayerControls />
    </Box>
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
