import { RegisterForm } from "@features/auth";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.metadata");

  return {
    title: t("register"),
  };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
