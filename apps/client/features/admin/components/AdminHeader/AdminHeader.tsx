"use client";

import { UserRound, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";
import styles from "./AdminHeader.module.scss";

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  titles: "Content Management",
  settings: "Settings",
};

export default function AdminHeader() {
  const pathname = usePathname();
  const sectionKey = pathname.split("/")[2] || "dashboard";
  const currentSection = SECTION_LABELS[sectionKey] || "Admin";

  return (
    <header className={styles.topBar}>
      <div className={styles.topBarInner}>
        <div className={styles.topBarTrail}>
          <span className={styles.topBarMuted}>Admin Panel</span>
          <span className={styles.topBarDivider}>/</span>
          <span className={styles.topBarCurrent}>{currentSection}</span>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.profileIcon}>
            <UsersRound size={22} />
          </div>

          <div className={styles.profileInfo}>
            <span className={styles.profileName}>Admin User</span>
            <span className={styles.profileRole}>Super Admin</span>
          </div>

          <div className={styles.profileAvatar}>
            <UserRound size={24} />
          </div>
        </div>
      </div>
    </header>
  );
}
