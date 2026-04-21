"use client";

import { Clapperboard, LogIn, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Header.module.scss";

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Movies", href: "/movie" },
    { label: "Series", href: "/series" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className={styles.header}>
      <div className={styles.navigationBar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon}>
            <Clapperboard size={18} />
          </span>
          <span>
            Watchly
            <small>Cinematic dashboard vibe</small>
          </span>
        </Link>

        <nav className={styles.navLinks} aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.label}
              className={`${styles.navLink} ${isActive(item.href) ? styles.active : ""}`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link className={styles.secondaryAction} href="/admin/dashboard">
            <Sparkles size={16} />
            Admin
          </Link>
          <Link className={styles.primaryAction} href="/login">
            <LogIn size={16} />
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
