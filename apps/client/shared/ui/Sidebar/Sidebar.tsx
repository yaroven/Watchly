"use client";

import BookmarkIcon from "@mui/icons-material/Bookmark";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import MovieIcon from "@mui/icons-material/Movie";
import { Box, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

export const DRAWER_WIDTH = 240;
export const DRAWER_WIDTH_COLLAPSED = 60;

const INDICATOR_HEIGHT = 32;
const COLLAPSE_BUTTON_TOP = 110;
const COLLAPSE_BUTTON_WIDTH = 18;
const COLLAPSE_BUTTON_HEIGHT = 48;
const COLLAPSE_BUTTON_FILLET = 12;
const SIDEBAR_BG = "#191919";
const BORDER_COLOR = "#6e6e6e";
const BORDER_GRADIENT = `linear-gradient(180deg, ${BORDER_COLOR} 0%, rgba(178, 178, 178, 0.12) 100%)`;

const menuItems = [
  { text: "Discover", href: "/", icon: <MovieIcon /> },
  { text: "Watchlist", href: "/series", icon: <BookmarkIcon /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const activeIndex = menuItems.findIndex((item) => item.href === pathname);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ top: 0, opacity: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const width = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  useLayoutEffect(() => {
    const container = listRef.current;
    const el = itemRefs.current[activeIndex];
    if (container && el) {
      const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + (el.offsetHeight - INDICATOR_HEIGHT) / 2;
      setIndicator({ top, opacity: 1 });
    } else {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeIndex]);

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
          backgroundColor: SIDEBAR_BG,
          color: "text.primary",
          border: "none",
          transition: "width 0.3s ease",
          overflow: "visible",
        },
      }}
    >
      {/* Continuous Sidebar Right Border */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "1px",
          background: BORDER_GRADIENT,
          zIndex: 1,
        }}
      />

      {/* Collapse Toggle Button */}
      <IconButton
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        disableRipple
        sx={{
          position: "absolute",
          top: `${COLLAPSE_BUTTON_TOP - COLLAPSE_BUTTON_HEIGHT / 2}px`,
          right: collapsed ? `-${COLLAPSE_BUTTON_WIDTH}px` : "0px",
          transition:
            "right 0.3s ease, border-radius 0.3s ease, width 0.3s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
          // Inset (expanded) grows further left, toward where the chevron points, so there's more
          // room around it; outset (collapsed) stays the original width since it already protrudes.
          width: collapsed ? `${COLLAPSE_BUTTON_WIDTH}px` : `${COLLAPSE_BUTTON_WIDTH + 10}px`,
          height: `${COLLAPSE_BUTTON_HEIGHT}px`,
          backgroundColor: SIDEBAR_BG,
          border: "1px solid",
          borderColor: BORDER_COLOR,
          zIndex: 3, // Overlays the 1px sidebar line directly underneath
          color: "#ffffff",
          padding: 0,

          // Dynamic Radii & Border Sides depending on collapsed state
          ...(collapsed
            ? {
                borderTopRightRadius: `${COLLAPSE_BUTTON_FILLET + 4}px`,
                borderBottomRightRadius: `${COLLAPSE_BUTTON_FILLET + 4}px`,
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft: "none",
              }
            : {
                borderTopLeftRadius: `${COLLAPSE_BUTTON_FILLET + 4}px`,
                borderBottomLeftRadius: `${COLLAPSE_BUTTON_FILLET + 4}px`,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                borderRight: "none",
              }),

          "&:hover": {
            backgroundColor: "#2a2a2a",
            borderColor: "primary.main",
            color: "primary.main",
            boxShadow: "0 0 8px rgba(231, 188, 15, 0.25)",
          },

          // Inverted Radii Fillets (Smooth Concave Curves)
          "&::before, &::after": {
            content: '""',
            position: "absolute",
            width: `${COLLAPSE_BUTTON_FILLET}px`,
            height: `${COLLAPSE_BUTTON_FILLET}px`,
            pointerEvents: "none",
            border: "none", // Removes any unwanted grey stroke/artifact
          },

          ...(collapsed
            ? {
                "&::before": {
                  left: 0,
                  top: `-${COLLAPSE_BUTTON_FILLET}px`,
                  borderBottomLeftRadius: `${COLLAPSE_BUTTON_FILLET}px`,
                  boxShadow: `-${COLLAPSE_BUTTON_FILLET}px ${COLLAPSE_BUTTON_FILLET}px 0 0 ${SIDEBAR_BG}`,
                },
                "&::after": {
                  left: 0,
                  bottom: `-${COLLAPSE_BUTTON_FILLET}px`,
                  borderTopLeftRadius: `${COLLAPSE_BUTTON_FILLET}px`,
                  boxShadow: `-${COLLAPSE_BUTTON_FILLET}px -${COLLAPSE_BUTTON_FILLET}px 0 0 ${SIDEBAR_BG}`,
                },
              }
            : {
                "&::before": {
                  right: 0,
                  top: `-${COLLAPSE_BUTTON_FILLET}px`,
                  borderBottomRightRadius: `${COLLAPSE_BUTTON_FILLET}px`,
                  boxShadow: `${COLLAPSE_BUTTON_FILLET}px ${COLLAPSE_BUTTON_FILLET}px 0 0 ${SIDEBAR_BG}`,
                },
                "&::after": {
                  right: 0,
                  bottom: `-${COLLAPSE_BUTTON_FILLET}px`,
                  borderTopRightRadius: `${COLLAPSE_BUTTON_FILLET}px`,
                  boxShadow: `${COLLAPSE_BUTTON_FILLET}px -${COLLAPSE_BUTTON_FILLET}px 0 0 ${SIDEBAR_BG}`,
                },
              }),
        }}
      >
        <ChevronLeftIcon
          sx={{
            fontSize: 20,
            filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))",
            transition: "transform 0.3s ease",
            transform: collapsed ? "rotate(180deg)" : "none",
          }}
        />
      </IconButton>

      {/* Header Logo */}
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
        <Link href="/" style={{ display: "flex" }}>
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

      {/* Navigation List */}
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
        {menuItems.map((item, index) => {
          const isActive = pathname === item.href;

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={isActive}
                ref={(el: HTMLAnchorElement | null) => {
                  itemRefs.current[index] = el;
                }}
                sx={{
                  py: "14px",
                  px: 3,
                  justifyContent: collapsed ? "center" : "flex-start",
                  transition: "padding 0.3s ease, justify-content 0.3s ease",
                  "&.Mui-selected": {
                    backgroundColor: "transparent",
                    color: "primary.main",
                    "&:hover": { backgroundColor: "transparent" },
                    "& .MuiListItemIcon-root": { color: "primary.main" },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? "primary.main" : "#b2b2b2",
                    minWidth: collapsed ? "auto" : "36px",
                    transition: "min-width 0.3s ease",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    flex: collapsed ? "0 0 0px" : "1 1 auto",
                    overflow: "hidden",
                    opacity: collapsed ? 0 : 1,
                    transition: "opacity 0.2s ease, flex-basis 0.3s ease",
                  }}
                  slotProps={{
                    primary: {
                      sx: { fontSize: "16px", fontWeight: 500, color: isActive ? "primary.main" : "#b2b2b2", whiteSpace: "nowrap" },
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}
