"use client";

import { Plus } from "lucide-react";
import styles from "../page.module.scss";

interface TitlesPageHeroProps {
  onCreate: () => void;
}

export default function TitlesPageHero({ onCreate }: TitlesPageHeroProps) {
  return (
    <div className={styles.hero}>
      <div>
        <h1 className={styles.title}>Content Library</h1>
        <p className={styles.subtitle}>
          Manage movies, series, and publishing workflow from one place.
        </p>
      </div>

      <button className={styles.addTitleButton} onClick={onCreate}>
        <Plus size={22} />
        <span>Add New</span>
      </button>
    </div>
  );
}
