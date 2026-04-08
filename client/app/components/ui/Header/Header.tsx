"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Header.module.scss";

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Movies", href: "/movie" },
    { label: "Series", href: "/series" },
    { label: "Authentication", href: "/auth" },
  ];

  return (
    <div className={styles.header}>
      <nav className={styles.navigationBar}>
        {navItems.map((item) => (
          <Link
            key={item.label}
            className={`${styles.navLink} ${pathname === item.href ? styles.active : ""}`}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
