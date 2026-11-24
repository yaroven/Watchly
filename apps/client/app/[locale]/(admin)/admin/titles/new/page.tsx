import { TitleCreate } from "@features/title";
import { BaseContentScope } from "@shared/lib/content-locale-scope";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");

  return { title: t("pages.createTitle") };
}

export default function Page() {
  return (
    <BaseContentScope>
      <TitleCreate />
    </BaseContentScope>
  );
}
