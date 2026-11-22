import { GenresLibrary } from "@features/genre";
import { BaseContentScope } from "@shared/lib/content-locale-scope";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");

  return { title: t("pages.genres") };
}

export default function Page() {
  return (
    <BaseContentScope>
      <GenresLibrary />
    </BaseContentScope>
  );
}
