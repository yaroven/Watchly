"use client";

import { APP } from "@/shared/lib/routes";
import { Bookmark as BookmarkIcon, Explore as ExploreIcon } from "@mui/icons-material";
import { Box, Drawer, List, Typography } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef } from "react";
import CollapseButton from "./components/CollapseButton";
import NavItem from "./components/NavItem";
import { useSidebar } from "./SidebarContext";
import { useActiveIndicator } from "./useActiveIndicator";

const INDICATOR_HEIGHT = 32;
const BORDER_GRADIENT = `linear-gradient(180deg, #6e6e6e 0%, rgba(178, 178, 178, 0.12) 100%)`;

const menuItems = [
  { text: "Discover", href: APP.DISCOVER, icon: <ExploreIcon /> },
  { text: "Watchlist", href: APP.WATCHLIST, icon: <BookmarkIcon /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  // Nested routes such as /discover/movie still belong to Discover, so this
  // matches by prefix and keeps the longest match when several apply.
  const activeIndex =
    menuItems
      .map((item, index) => ({ index, href: item.href }))
      .filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.index ?? -1;
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const indicator = useActiveIndicator(activeIndex, listRef, itemRefs, INDICATOR_HEIGHT);

  const { collapsed, toggle } = useSidebar();
  const width = collapsed ? "clamp(56px, 6vw, 64px)" : "clamp(200px, 18vw, 240px)";

  const itemRefCallbacks = useMemo(
    () =>
      menuItems.map((_, index) => (el: HTMLAnchorElement | null) => {
        itemRefs.current[index] = el;
      }),
    [],
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        transition: "width 0.3s ease",
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          backgroundColor: "#191919",
          color: "text.primary",
          border: "none",
          transition: "width 0.3s ease",
          overflow: "visible",
        },
      }}
    >
      <Box sx={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "1px", background: BORDER_GRADIENT, zIndex: 1 }} />

      <CollapseButton collapsed={collapsed} onToggle={toggle} />

      <Box
        sx={{
          py: 4,
          display: "flex",
          justifyContent: "center",
          overflow: "hidden",
          opacity: collapsed ? 0 : 1,
          maxHeight: collapsed ? 0 : 96,
          transition: "opacity 0.2s ease, max-height 0.3s ease",
        }}
      >
        <Link href={APP.DISCOVER} style={{ display: "flex" }}>
          <Image src="/logo.png" alt="Watchly" width={148} height={33} priority />
        </Link>
      </Box>

      <Typography
        sx={{
          px: 3,
          pb: 1,
          fontSize: "14px",
          color: "#666666",
          fontWeight: "700",
          overflow: "hidden",
          opacity: collapsed ? 0 : 1,
          maxHeight: collapsed ? 0 : 30,
          transition: "opacity 0.2s ease, max-height 0.3s ease",
        }}
      >
        Menu
      </Typography>

      <List ref={listRef} sx={{ py: 0, position: "relative" }}>
        <Box
          sx={{
            position: "absolute",
            left: 0,
            width: "6px",
            height: `${INDICATOR_HEIGHT}px`,
            backgroundColor: "primary.main",
            borderRadius: "0 32px 32px 0",
            transition: "top 0.25s ease, opacity 0.2s ease",
            pointerEvents: "none",
            top: indicator.top,
            opacity: indicator.opacity,
          }}
        />
        {menuItems.map((item, index) => (
          <NavItem
            key={item.text}
            href={item.href}
            text={item.text}
            icon={item.icon}
            isActive={index === activeIndex}
            collapsed={collapsed}
            itemRef={itemRefCallbacks[index]}
          />
        ))}
      </List>
    </Drawer>
  );
}
