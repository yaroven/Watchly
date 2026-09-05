import Header from "@/shared/ui/Header";
import Sidebar from "@/shared/ui/Sidebar";
import { SidebarProvider } from "@/shared/ui/Sidebar/SidebarContext";
import Box from "@mui/material/Box";
import type { ReactNode } from "react";

/**
 * Sidebar + header frame for the public site.
 *
 * The (main) layout provides this to its pages, but not-found and error
 * files render outside it — a root not-found has no segment layout, and an
 * error boundary cannot rely on the layout it may have to replace. Both
 * wrap their content in this instead of repeating the frame.
 */
export default function SiteShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
          <Header />
          <Box sx={{ px: "24px" }} component="main">
            {children}
          </Box>
        </Box>
      </Box>
    </SidebarProvider>
  );
}
