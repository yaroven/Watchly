import Link from "next/link";
import styles from "./SidebarItem.module.scss";

interface SidebarItemProps {
  name: string;
  to: string;
  isActive: boolean;
  icon: React.ElementType;
}

export default function SidebarItem({ name, to, isActive, icon: Icon }: SidebarItemProps) {
  return (
    <Link href={to} className={`${styles.item} ${isActive && styles.active}`}>
      <Icon />
      <p className={styles.text}>{name}</p>
    </Link>
  );
}
