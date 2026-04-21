import styles from "./EpisodeItem.module.scss";

interface EpisodeItemProps {
  number: number;
  isActive: boolean;
  onClick: () => void;
}

export default function EpisodeItem({ number, isActive, onClick }: EpisodeItemProps) {
  return (
    <div className={`${styles.episodeContainer} ${isActive && styles.active}`} onClick={onClick}>
      Episode {number}
    </div>
  );
}
