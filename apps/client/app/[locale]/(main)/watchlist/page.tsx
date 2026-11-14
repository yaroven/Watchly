import { WatchlistScreen } from "@features/title";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.metadata");

  return {
    title: t("watchlist"),
  };
}

export default function Page() {
  return <WatchlistScreen />;
}
