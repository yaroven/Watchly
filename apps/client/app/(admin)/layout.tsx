import { AdminHeader, Sidebar } from "@/features/admin";
import { SidebarProvider } from "@/shared/ui/Sidebar/SidebarContext";
import Role from "@/types/role";
import { AuthorizeView } from "@features/auth";
import Box from "@mui/material/Box";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watchly Admin",
  description: "Admin panel for Watchly",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthorizeView roles={[Role.ADMIN]}>
      <SidebarProvider>
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <Box sx={{ flex: "1 1 auto", minWidth: 0 }} component="main">
            <AdminHeader />
            {children}
          </Box>
        </Box>
      </SidebarProvider>
    </AuthorizeView>
  );
}
