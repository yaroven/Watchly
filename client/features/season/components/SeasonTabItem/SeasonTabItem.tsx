import styles from "./SeasonTabItem.module.scss";

interface SeasonTabItemProps {
  number: number;
  isActive: boolean;
  onClick: () => void;
}

export default function SeasonTabItem({ number, isActive, onClick }: SeasonTabItemProps) {
  return (
    <div onClick={onClick} className={`${styles.tab} ${isActive && styles.active}`}>
      {number} season
    </div>
  );
}
