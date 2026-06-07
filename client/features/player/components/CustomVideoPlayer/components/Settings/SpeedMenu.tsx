import { usePlayerPlaybackRate } from "../../CustomVideoPlayerContext";
import { formatPlaybackRate } from "../../utils";
import styles from "./Settings.module.scss";

export default function SpeedMenu() {
  const { value, options, set } = usePlayerPlaybackRate();

  return options.map((option) => {
    const isActive = value === option;

    return (
      <button
        key={option}
        type="button"
        className={`${styles.menuOption} ${isActive ? styles.active : ""}`}
        onClick={() => set(option)}
        aria-pressed={isActive}
      >
        {formatPlaybackRate(option)}
      </button>
    );
  });
}
