import { Season } from "@/app/types/season";
import SeasonTabItem from "../SeasonTabItem";
import styles from "./SeasonTabs.module.scss";

interface SeasonTabsProps {
  seasons: Season[];
  currentSeasonId: string;
  onClick: (id: string) => void;
}

export default function SeasonTabs({ seasons, currentSeasonId, onClick }: SeasonTabsProps) {
  return (
    <div className={styles.tabs}>
      {seasons.map(({ id, number }) => (
        <SeasonTabItem
          onClick={() => onClick(id)}
          key={id}
          number={number}
          isActive={id === currentSeasonId}
        />
      ))}
    </div>
  );
}
