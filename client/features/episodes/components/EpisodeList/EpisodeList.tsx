import { Episode } from "@/features/episodes/schemas/episode";

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
      {episodes.map((episode) => (
        <EpisodeItem
          key={episode.id}
          onClick={() => onClick(episode.id)}
          number={episode.number}
          name={episode.name}
          transcodingStatus={episode.transcodingStatus}
          isActive={episode.id === currentEpisodeId}
        />
      ))}
    </div>
  );
}
