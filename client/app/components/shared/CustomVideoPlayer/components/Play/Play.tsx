import { Pause, Play as PlayIcon } from "lucide-react";

import styles from "./Play.module.scss";

interface PlayProps {
  isPlaying: boolean;
  size: number;
  videoPlayHandler: () => void;
  videoPauseHandler: () => void;
}

export default function Play({ isPlaying, size, videoPauseHandler, videoPlayHandler }: PlayProps) {
  return (
    <button
      onClick={isPlaying ? videoPauseHandler : videoPlayHandler}
      className={styles.playButton}
      style={{ width: size, height: size }}
    >
      {isPlaying ? <Pause size={size} /> : <PlayIcon size={size} />}
    </button>
  );
}
