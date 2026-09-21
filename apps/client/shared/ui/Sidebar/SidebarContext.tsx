"use client";

import { useMediaQuery } from "@mui/material";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/**
 * Holds the collapsed state so pages can react to it — the catalog shows more
 * cards per row while the sidebar is out of the way.
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  // null means "follow the viewport"; a boolean means the user chose.
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);
  const collapsed = manualCollapsed ?? isMobile;

  const value = useMemo(() => ({ collapsed, toggle: () => setManualCollapsed(!collapsed) }), [collapsed]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider");
  return context;
}
