import { Episode } from "@/app/types/episode";
import EpisodeItem from "../EpisodeItem";
import styles from "./EpisodeList.module.scss";

interface EpisodeListProps {
  episodes: Episode[];
  currentEpisodeId: string;
  onClick: (id: string) => void;
}

export default function EpisodeList({ episodes, currentEpisodeId, onClick }: EpisodeListProps) {
  return (
    <div className={styles.episodeList}>
      {episodes.map(({ id, number }) => (
        <EpisodeItem
          key={id}
          onClick={() => onClick(id)}
          number={number}
          isActive={id === currentEpisodeId}
        />
      ))}
    </div>
  );
}
