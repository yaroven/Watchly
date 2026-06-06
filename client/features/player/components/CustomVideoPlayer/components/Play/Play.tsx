import { Pause, Play as PlayIcon } from "lucide-react";

import styles from "./Play.module.scss";

interface PlayProps {
  isPlaying: boolean;
  size: number;
  onToggle: () => void | Promise<void>;
}

export default function Play({ isPlaying, size, onToggle }: PlayProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={styles.playButton}
      style={{ width: size, height: size }}
      aria-label={isPlaying ? "Pause video" : "Play video"}
      title={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? <Pause size={size} /> : <PlayIcon size={size} />}
    </button>
  );
}
