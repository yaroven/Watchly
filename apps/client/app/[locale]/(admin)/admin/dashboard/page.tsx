import { DashboardScreen } from "@features/admin";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");

  return { title: t("pages.dashboard") };
}

export default function Page() {
  return <DashboardScreen />;
}
