import Sidebar from "@/app/components/admin/Sidebar/Sidebar";
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
      {children}
    </div>
  );
}
