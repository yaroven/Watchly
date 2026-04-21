import Sidebar from "@/features/admin/components/Sidebar";
import type { Metadata } from "next";
import "../globals.scss";
import styles from "./layout.module.scss";

export const metadata: Metadata = {
  title: "Watchly Admin",
  description: "Admin panel for Watchly",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.adminLayout}>
      <Sidebar />
      <div className={styles.adminContent}>
        <main className={styles.adminMain}>{children}</main>
      </div>
    </div>
  );
}
