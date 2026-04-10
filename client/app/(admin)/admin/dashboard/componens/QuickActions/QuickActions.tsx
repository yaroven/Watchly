"use client";

import { ADMIN } from "@/app/constants/routes";
import { LayoutDashboard, PlusCircle, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./QuickActions.module.scss";

export default function QuickActions() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Quick Actions</h2>
      <div className={styles.quickActions}>
        <button className={styles.actionButton} onClick={() => router.push(ADMIN.TITLES_NEW)}>
          <PlusCircle size={20} />
          Add New Title
        </button>
        <button className={styles.actionButton} onClick={() => router.push(ADMIN.TITLES)}>
          <Settings size={20} />
          Manage All Titles
        </button>
        <button className={styles.actionButton} onClick={() => router.push(ADMIN.ROOT)}>
          <LayoutDashboard size={20} />
          Overview
        </button>
      </div>
    </div>
  );
}
