import styles from "./StatCard.module.scss";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  id: string;
}

export default function StatCard({ label, value, icon, id }: StatCardProps) {
  return (
    <div key={label} className={styles.card}>
      <div className={`${styles.icon} ${styles[id]}`}>{icon}</div>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </div>
    </div>
  );
}
