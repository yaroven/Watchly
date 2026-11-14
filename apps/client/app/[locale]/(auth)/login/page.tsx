import { LoginForm } from "@features/auth";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.metadata");

  return {
    title: t("login"),
  };
}

export default function LoginPage() {
  return <LoginForm />;
}
