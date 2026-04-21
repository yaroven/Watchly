import TitleForm from "@/features/title/components/TitleForm";
import styles from "./page.module.scss";

export default function Page() {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div>
          <h1 className={styles.pageTitle}>Create Title</h1>
          <p className={styles.pageSubtitle}>
            Add a new movie or series to the library and prepare it for publishing.
          </p>
        </div>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Title Details</h2>
          <p>Fill in the core metadata and upload the source file for movies.</p>
        </div>
        <TitleForm />
      </section>
    </div>
  );
}
