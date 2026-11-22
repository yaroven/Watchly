import { getTitleForRequest, loadTitlePage, MovieDetails, SeriesDetails, type TitlePageData, TitleType } from "@features/title";
import type { ContentLocale } from "@shared/lib/content-locale";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = (await getLocale()) as ContentLocale;
  try {
    const title = await getTitleForRequest(id, locale);
    const t = await getTranslations("pages.metadata");
    return {
      title: t("title", { name: title.name }),
      description: title.description,
    };
  } catch {
    return {
      title: "Watchly",
    };
  }
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const locale = (await getLocale()) as ContentLocale;
  const { season } = await searchParams;

  let data: TitlePageData;
  try {
    data = await loadTitlePage(id, locale, season);
  } catch (error) {
    console.error("Failed to fetch title details", error);
    return notFound();
  }

  if (data.title.type === TitleType.MOVIE) return <MovieDetails title={data.title} />;

  return <SeriesDetails title={data.title} seasons={data.seasons} episodes={data.episodes} currentSeasonId={data.currentSeasonId} />;
}
