"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DashboardIcon from "@mui/icons-material/Dashboard";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import { Box, Drawer, List, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ADMIN, APP } from "@shared/lib/routes";
import { tokens } from "@shared/mui/theme";
import CollapseButton from "@shared/ui/Sidebar/components/CollapseButton";
import { useSidebar } from "@shared/ui/Sidebar/SidebarContext";
import { useActiveIndicator } from "@shared/ui/Sidebar/useActiveIndicator";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef } from "react";
import AdminNavItem from "./components/AdminNavItem";

const INDICATOR_HEIGHT = 32;
const BORDER_GRADIENT = `linear-gradient(180deg, #6e6e6e 0%, rgba(178, 178, 178, 0.12) 100%)`;

const menuItems = [
  { text: "Dashboard", href: ADMIN.DASHBOARD, icon: <DashboardIcon /> },
  { text: "Titles", href: ADMIN.TITLES, icon: <VideoLibraryIcon /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const activeIndex = menuItems.findIndex((item) => pathname.startsWith(item.href));
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
          pt: 4,
          pb: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          overflow: "hidden",
          opacity: collapsed ? 0 : 1,
          maxHeight: collapsed ? 0 : 120,
          transition: "opacity 0.2s ease, max-height 0.3s ease",
        }}
      >
        <Link href={ADMIN.DASHBOARD} style={{ display: "flex" }}>
          <Image src="/logo.png" alt="Watchly" width={148} height={33} priority />
        </Link>
        <Box
          sx={{
            px: "10px",
            py: "3px",
            borderRadius: "999px",
            backgroundColor: alpha(tokens.accent.primary, 0.12),
            border: "1px solid",
            borderColor: alpha(tokens.accent.primary, 0.3),
          }}
        >
          <Typography
            sx={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "primary.main",
            }}
          >
            Admin
          </Typography>
        </Box>
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

      <List ref={listRef} sx={{ py: 0, position: "relative", flex: 1 }}>
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
          <AdminNavItem
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

      <List sx={{ py: 0, mb: 4 }}>
        <AdminNavItem
          href={APP.ROOT}
          text="Back to Site"
          icon={<ArrowBackIcon />}
          isActive={false}
          collapsed={collapsed}
          itemRef={() => {}}
        />
      </List>
    </Drawer>
  );
}
