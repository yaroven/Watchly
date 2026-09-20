import EpisodeService from "@features/episodes/api/episode.service";
import SeasonService from "@features/season/api/season.service";
import { MovieStream, SeriesStream } from "@features/title";
import TitleService from "@features/title/api/title.service";
import { TitleType } from "@features/title/schemas/title";
import { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string }>;
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

/** Newest season/episode first — "watch" with no episode picks up the latest release. */
const byNumberDesc = <T extends { number: number }>(a: T, b: T) => b.number - a.number;

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { episode: episodeParam } = await searchParams;

  let title: Awaited<ReturnType<typeof TitleService.getById>>;
  let movieUrl = "";
  let season: Awaited<ReturnType<typeof SeasonService.getAll>>[number] | undefined;
  let episodes: Awaited<ReturnType<typeof EpisodeService.getAll>> = [];
  let currentEpisodeId = "";
  let episodeUrl = "";

  try {
    title = await TitleService.getById(id);

    if (title.type === TitleType.MOVIE) {
      movieUrl = await TitleService.getStreamUrl(id);
    } else {
      const seasons = await SeasonService.getAll(id);
      if (!seasons.length) return notFound();

      season = [...seasons].sort(byNumberDesc)[0];

      if (episodeParam) {
        try {
          const requestedEpisode = await EpisodeService.getById(episodeParam);
          const matchingSeason = seasons.find((candidate) => candidate.id === requestedEpisode.seasonId);
          if (matchingSeason) season = matchingSeason;
        } catch {
          // Unknown episode id — fall back to the latest season.
        }
      }

      episodes = await EpisodeService.getAll(season.id);
      if (!episodes.length) return notFound();

      const currentEpisode =
        (episodeParam && episodes.find((episode) => episode.id === episodeParam)) || [...episodes].sort(byNumberDesc)[0];
      currentEpisodeId = currentEpisode.id;
      episodeUrl = await EpisodeService.getStreamUrl(currentEpisode.id);
    }
  } catch (error) {
    console.error("Failed to fetch title stream", error);
    return notFound();
  }

  if (title.type === TitleType.MOVIE) {
    return <MovieStream title={title} streamUrl={movieUrl} />;
  }

  return (
    <SeriesStream title={title} season={season!} episodes={episodes} initialEpisodeUrl={episodeUrl} initialEpisodeId={currentEpisodeId} />
  );
}
