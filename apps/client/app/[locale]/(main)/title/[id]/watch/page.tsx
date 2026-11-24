import { getTitleForRequest, loadWatchPage, MovieStream, SeriesStream, type WatchPageData } from "@features/title";
import type { ContentLocale } from "@shared/lib/content-locale";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string }>;
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
  const { episode } = await searchParams;

  let data: WatchPageData | null;
  try {
    data = await loadWatchPage(id, locale, episode);
  } catch (error) {
    console.error("Failed to fetch title stream", error);
    return notFound();
  }

  if (!data) return notFound();
  if (data.kind === "movie") return <MovieStream title={data.title} streamUrl={data.streamUrl} />;

  return (
    <SeriesStream
      title={data.title}
      season={data.season}
      episodes={data.episodes}
      initialEpisodeUrl={data.streamUrl}
      initialEpisodeId={data.episodeId}
    />
  );
}
