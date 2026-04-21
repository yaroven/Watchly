import { Episode } from "@/features/episodes/schemas/episode";
import { Edit, Play, Trash } from "lucide-react";
import { useEpisodeManagerContext } from "../../context/EpisodeManagerContext";
import styles from "./EpisodeItem.module.scss";

interface EpisodeItemProps {
  episode: Episode;
}

export default function EpisodeItem({ episode }: EpisodeItemProps) {
  const { openPreview, openEdit, openDelete } = useEpisodeManagerContext();
  return (
    <div key={episode.id} className={styles.item}>
      <div className={styles.info}>
        <span className={styles.number}>#{episode.number}</span>
        <span className={styles.name}>{episode.name}</span>
      </div>
      <div className={styles.actions}>
        <button onClick={() => openPreview(episode)} className={styles.iconBtn}>
          <Play size={16} />
        </button>
        <button onClick={() => openEdit(episode)} className={styles.iconBtn}>
          <Edit size={16} />
        </button>
        <button onClick={() => openDelete(episode)} className={styles.iconBtn}>
          <Trash size={16} />
        </button>
      </div>
    </div>
  );
}
