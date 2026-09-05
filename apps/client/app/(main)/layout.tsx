import SiteShell from "@/shared/ui/SiteShell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watchly",
  description: "Watch movies and series online with comfort on Watchly",
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SiteShell>{children}</SiteShell>;
}
