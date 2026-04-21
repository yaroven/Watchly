import { Expand, Shrink } from "lucide-react";
import styles from "./Fullscreen.module.scss";

interface FullscreenProps {
  isFullscreen: boolean;
  onClick: () => void;
}

export default function Fullscreen({ isFullscreen, onClick }: FullscreenProps) {
  return (
    <button className={styles.screenButton} onClick={onClick}>
      {isFullscreen ? <Shrink /> : <Expand />}
    </button>
  );
}
