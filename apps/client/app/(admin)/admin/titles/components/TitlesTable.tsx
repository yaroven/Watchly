"use client";

import AdminTitle from "@/features/title/components/AdminTitle";
import { Title } from "@/features/title/schemas/title";
import styles from "../page.module.scss";

interface TitlesTableProps {
  titles: Title[];
}

export default function TitlesTable({ titles }: TitlesTableProps) {
  return (
    <section className={styles.tableCard}>
      <div className={styles.tableHead}>
        <span>Title</span>
        <span>Year</span>
        <span>Type</span>
        <span>Status</span>
        <span>Actions</span>
      </div>

      <div className={styles.titlesList}>
        {titles.length ? (
          titles.map((title) => <AdminTitle key={title.id} {...title} to={`/admin/titles/${title.id}`} />)
        ) : (
          <div className={styles.emptyState}>
            <h2>No titles found</h2>
            <p>Try changing your search query or clearing the active filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}
