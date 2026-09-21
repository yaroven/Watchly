"use client";

import { Box, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { tokens } from "@shared/mui/theme";
import Link from "next/link";
import { type ReactNode } from "react";

const ICON_TILE_SIZE = 32;

const buttonBaseSx = {
  py: "12px",
  px: "10px",
  mx: "10px",
  borderRadius: "12px",
  transition: "background-color 0.2s ease, padding 0.3s ease, justify-content 0.3s ease",
  "&.Mui-selected": {
    backgroundColor: alpha(tokens.accent.primary, 0.08),
    "&:hover": { backgroundColor: alpha(tokens.accent.primary, 0.12) },
  },
};

interface AdminNavItemProps {
  href: string;
  text: string;
  icon: ReactNode;
  isActive: boolean;
  collapsed: boolean;
  itemRef: (el: HTMLAnchorElement | null) => void;
}

// Icon tile + inset active pill give admin nav real visual weight, layered on
// top of the gold accent bar drawn separately by the sidebar's list indicator.
export default function AdminNavItem({ href, text, icon, isActive, collapsed, itemRef }: AdminNavItemProps) {
  const accentColor = isActive ? "primary.main" : "#b2b2b2";

  return (
    <ListItem disablePadding>
      <ListItemButton
        component={Link}
        href={href}
        selected={isActive}
        ref={itemRef}
        sx={[buttonBaseSx, { justifyContent: collapsed ? "center" : "flex-start" }]}
      >
        <ListItemIcon sx={{ minWidth: collapsed ? "auto" : "44px", transition: "min-width 0.3s ease" }}>
          <Box
            sx={{
              width: ICON_TILE_SIZE,
              height: ICON_TILE_SIZE,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              backgroundColor: isActive ? alpha(tokens.accent.primary, 0.16) : "rgba(255,255,255,0.04)",
              color: accentColor,
              transition: "background-color 0.2s ease, color 0.2s ease",
              "& svg": { fontSize: 20 },
            }}
          >
            {icon}
          </Box>
        </ListItemIcon>
        <ListItemText
          primary={text}
          sx={{
            flex: collapsed ? "0 0 0px" : "1 1 auto",
            overflow: "hidden",
            opacity: collapsed ? 0 : 1,
            transition: "opacity 0.2s ease, flex-basis 0.3s ease",
          }}
          slotProps={{
            primary: { sx: { fontSize: "16px", fontWeight: 500, color: accentColor, whiteSpace: "nowrap" } },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}
