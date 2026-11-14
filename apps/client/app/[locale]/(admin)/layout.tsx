import Role from "@/types/role";
import { AdminHeader, Sidebar } from "@features/admin";
import { AuthorizeView } from "@features/auth";
import Box from "@mui/material/Box";
import { SidebarProvider } from "@shared/ui/Sidebar/SidebarContext";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");

  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

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
