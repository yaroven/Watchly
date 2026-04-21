"use client";
import { ArrowLeft, LayoutDashboard, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import SidebarItem from "./components/SidebarItem";
import styles from "./Sidebar.module.scss";

export default function Sidebar() {
  const pathname = usePathname();

  const items = [
    { name: "Dashboard", link: "dashboard", icon: LayoutDashboard },
    { name: "Titles", link: "titles", icon: Settings },
    { name: "Settings", link: "settings", icon: Settings },
  ];
  return (
    <>
      <div className={styles.sidebarSpacer} />
      <div className={styles.sidebar}>
        <div>
          <h1 className={styles.sidebarTitle}>Watchly</h1>
          <div className={styles.sidebarItems}>
            {items.map(({ name, link, icon }, index) => (
              <SidebarItem
                key={index}
                name={name}
                icon={icon}
                to={`/admin/${link}`}
                isActive={pathname === `/admin/${link}`}
              />
            ))}
          </div>
        </div>
        <div className={styles.sidebarFooter}>
          <SidebarItem name="Back to Site" icon={ArrowLeft} to={`/`} isActive={pathname === `/`} />
        </div>
      </div>
    </>
  );
}
