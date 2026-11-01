import Header from "@/shared/ui/Header";
import Sidebar from "@/shared/ui/Sidebar";
import { SidebarProvider } from "@/shared/ui/Sidebar/SidebarContext";
import Box from "@mui/material/Box";
import { Suspense, type ReactNode } from "react";

export default function SiteShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
          <Suspense>
            <Header />
          </Suspense>
          <Box sx={{ px: `24px` }} component="main">
            {children}
          </Box>
        </Box>
      </Box>
    </SidebarProvider>
  );
}
