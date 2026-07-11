import { usePlayerQuality } from "../../CustomVideoPlayerContext";
import { getQualityOptionLabel } from "../../utils";
import styles from "./Settings.module.scss";

interface QualityMenuProps {
  onSelect: (level: number) => void;
}

export default function QualityMenu({ onSelect }: QualityMenuProps) {
  const { selected, options, currentLevel } = usePlayerQuality();

  if (!options.length) return <div className={styles.menuOption}>Auto</div>;

  return options.map((option) => {
    const isActive = selected === option.level;

    return (
      <button
        key={option.level}
        type="button"
        className={`${styles.menuOption} ${isActive ? styles.active : ""}`}
        onClick={() => onSelect(option.level)}
        aria-pressed={isActive}
      >
        {getQualityOptionLabel(option, options, currentLevel)}
      </button>
    );
  });
}
