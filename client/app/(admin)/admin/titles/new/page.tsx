import TitleForm from "@/app/components/admin/TitleForm";
import styles from "./page.module.scss";

export default function Page() {
  return (
    <div className={styles.container}>
      <TitleForm />
    </div>
  );
}
