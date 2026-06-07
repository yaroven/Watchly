import { Expand, Shrink } from "lucide-react";

import { usePlayerFullscreen } from "../../CustomVideoPlayerContext";
import styles from "./Fullscreen.module.scss";

export default function Fullscreen() {
  const { active, toggle } = usePlayerFullscreen();

  return (
    <button
      type="button"
      className={styles.screenButton}
      onClick={toggle}
      aria-label={active ? "Exit fullscreen" : "Enter fullscreen"}
      title={active ? "Exit fullscreen" : "Fullscreen"}
    >
      {active ? <Shrink /> : <Expand />}
    </button>
  );
}
