"use client";
import SidebarItem from "./components";
import styles from "./Sidebar.module.scss";

export default function Sidebar() {
  const items = [
    { name: "Dashboard", link: "dashboard" },
    { name: "Titles", link: "titles" },
    { name: "Settings", link: "settings" },
  ];
  return (
    <>
      <div className={styles.sidebarSpacer} />
      <div className={styles.sidebar}>
        <h1 className={styles.sidebarTitle}>Watchly Admin Panel</h1>
        <div className={styles.sidebarItems}>
          {items.map((item, index) => (
            <SidebarItem key={index} name={item.name} to={`/admin/${item.link}`} />
          ))}
        </div>
      </div>
    </>
  );
}
