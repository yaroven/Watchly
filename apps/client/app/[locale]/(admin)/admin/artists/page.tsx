import { ArtistsLibrary } from "@features/artist";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");

  return { title: t("pages.actors") };
}

export default function Page() {
  return <ArtistsLibrary />;
}
