"use client";

import { Season } from "@/features/season/schemas/season";
import { Edit, Trash } from "lucide-react";
import styles from "../../SeasonManager.module.scss";
import { useSeasonManagerContext } from "../../context/SeasonManagerContext";

interface SeasonItemProps {
  season: Season;
  isSelected: boolean;
  onSelect: (seasonId: string) => void;
}

export default function SeasonItem({ season, isSelected, onSelect }: SeasonItemProps) {
  const { openEdit, openDelete } = useSeasonManagerContext();

  return (
    <div
      className={`${styles.item} ${isSelected ? styles.selected : ""}`}
      onClick={() => onSelect(season.id)}
    >
      <div className={styles.info}>
        <span className={styles.number}>#{season.number}</span>
        <span className={styles.name}>{season.name}</span>
      </div>
      <div className={styles.actions}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEdit(season);
          }}
          className={styles.iconBtn}
        >
          <Edit size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openDelete(season);
          }}
          className={styles.iconBtn}
        >
          <Trash size={16} />
        </button>
      </div>
    </div>
  );
}
