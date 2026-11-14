import { UsersLibrary } from "@features/user";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");

  return { title: t("pages.users") };
}

export default function Page() {
  return (
    <Suspense>
      <UsersLibrary />
    </Suspense>
  );
}
