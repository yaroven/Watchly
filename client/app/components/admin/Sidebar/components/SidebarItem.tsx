import Link from "next/link";
import styles from "./SidebarItem.module.scss";

interface SidebarItemProps {
  name: string;
  to: string;
}

export default function SidebarItem({ name, to }: SidebarItemProps) {
  return (
    <div className={styles.item}>
      <Link href={to} className={styles.text}>
        {name}
      </Link>
    </div>
  );
}
