import { TitlesLibrary } from "@features/title";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");

  return { title: t("pages.titles") };
}

export default function Page() {
  return (
    <Suspense>
      <TitlesLibrary />
    </Suspense>
  );
}
