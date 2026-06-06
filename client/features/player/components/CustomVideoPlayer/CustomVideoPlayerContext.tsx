import { createContext, RefObject, useContext } from "react";

export interface VideoQuality {
  level: number; // -1 for auto
  height: number;
  label: string;
}

interface CustomVideoPlayerContextType {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoContainerRef: RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  areControlsVisible: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  timeline: number;
  buffered: number;
  duration: number;
  volumeValue: number;
  isMuted: boolean;
  isFullscreen: boolean;
  onPlayToggle: () => void;
  onSeek: (time: number) => void;
  onVolumeSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  quality: number;
  setQuality: (quality: number) => void;
  qualities: VideoQuality[];
  currentLevelIndex: number;
}

const CustomVideoPlayerContext = createContext<CustomVideoPlayerContextType | null>(null);

export const useCustomVideoPlayer = () => {
  const context = useContext(CustomVideoPlayerContext);
  if (!context) {
    throw new Error("useCustomVideoPlayer must be used within a CustomVideoPlayerProvider");
  }
  return context;
};

export default CustomVideoPlayerContext;
