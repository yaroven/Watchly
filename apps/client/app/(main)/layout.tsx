import Header from "@/shared/ui/Header";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Metadata } from "next";
import "../globals.scss";
import styles from "./layout.module.scss";

export const metadata: Metadata = {
  title: "Watchly",
  description: "Watch movies and series online with comfort on Watchly",
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
