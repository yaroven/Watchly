import { SearchResults } from "@features/title";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.metadata");

  return {
    title: t("search"),
  };
}

export default function Page() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
