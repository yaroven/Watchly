import { Expand, Shrink } from "lucide-react";
import styles from "./Fullscreen.module.scss";

interface FullscreenProps {
  isFullscreen: boolean;
  onClick: () => void;
}

export default function Fullscreen({ isFullscreen, onClick }: FullscreenProps) {
  return (
    <button
      type="button"
      className={styles.screenButton}
      onClick={onClick}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
    >
      {isFullscreen ? <Shrink /> : <Expand />}
    </button>
  );
}
