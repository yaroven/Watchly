import EpisodeService from "@features/episodes/api/episode.service";
import SeasonService from "@features/season/api/season.service";
import { MovieDetails, SeriesDetails } from "@features/title";
import TitleService from "@features/title/api/title.service";
import { TitleType } from "@features/title/schemas/title";
import { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const title = await TitleService.getById(id);
    return {
      title: `${title.name} | Watchly`,
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
  const { season: seasonId } = await searchParams;

  let title: Awaited<ReturnType<typeof TitleService.getById>>;
  let seasons: Awaited<ReturnType<typeof SeasonService.getAll>> = [];
  let episodes: Awaited<ReturnType<typeof EpisodeService.getAll>> = [];
  let currentSeasonId = "";

  try {
    title = await TitleService.getById(id);

    if (title.type === TitleType.SERIES) {
      seasons = await SeasonService.getAll(id);
      currentSeasonId = seasonId && seasons.some((season) => season.id === seasonId) ? seasonId : (seasons[0]?.id ?? "");

      if (currentSeasonId) {
        episodes = await EpisodeService.getAll(currentSeasonId);
      }
    }
  } catch (error) {
    console.error("Failed to fetch title details", error);
    return notFound();
  }

  if (title.type === TitleType.MOVIE) {
    return <MovieDetails title={title} />;
  }

  return <SeriesDetails title={title} seasons={seasons} episodes={episodes} currentSeasonId={currentSeasonId} />;
}
