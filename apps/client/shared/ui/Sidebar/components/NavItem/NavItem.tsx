"use client";

import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import Link from "next/link";
import { type ReactNode } from "react";

const buttonBaseSx = {
  py: "14px",
  px: 3,
  transition: "padding 0.3s ease, justify-content 0.3s ease",
  "&.Mui-selected": {
    backgroundColor: "transparent",
    color: "primary.main",
    "&:hover": { backgroundColor: "transparent" },
    "& .MuiListItemIcon-root": { color: "primary.main" },
  },
};

interface NavItemProps {
  href: string;
  text: string;
  icon: ReactNode;
  isActive: boolean;
  collapsed: boolean;
  itemRef: (el: HTMLAnchorElement | null) => void;
}

export default function NavItem({ href, text, icon, isActive, collapsed, itemRef }: NavItemProps) {
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
        <ListItemIcon sx={{ color: accentColor, minWidth: collapsed ? "auto" : "36px", transition: "min-width 0.3s ease" }}>
          {icon}
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
