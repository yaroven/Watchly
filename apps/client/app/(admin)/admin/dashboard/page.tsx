import { DashboardScreen } from "@/features/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Watchly Admin",
};

export default function Page() {
  return <DashboardScreen />;
}
