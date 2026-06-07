import EpisodeService from "@/features/episodes/api/episode.service";
import SeasonService from "@/features/season/api/season.service";
import TitleService from "@/features/title/api/title.service";
import TitleInfo from "@/features/title/components/TitleInfo";
import JsonLd from "@/shared/ui/JsonLd";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import SeriesDetailsClient from "./SeriesDetailsClient";
import styles from "./page.module.scss";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string; episode?: string }>;
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
      title: "Series | Watchly",
    };
  }
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { season: seasonId, episode: episodeId } = await searchParams;
  let title: Awaited<ReturnType<typeof TitleService.getById>>;
  let seasons: Awaited<ReturnType<typeof SeasonService.getAll>> = [];
  let episodes: Awaited<ReturnType<typeof EpisodeService.getAll>> = [];
  let currentSeasonId = "";
  let currentEpisodeId = "";
  let episodeUrl = "";

  try {
    title = await TitleService.getById(id);
    seasons = await SeasonService.getAll(id);
    currentSeasonId =
      seasonId && seasons.some((season) => season.id === seasonId)
        ? seasonId
        : (seasons[0]?.id ?? "");

    if (currentSeasonId) {
      episodes = await EpisodeService.getAll(currentSeasonId);
    }

    if (episodes.length > 0) {
      currentEpisodeId =
        episodeId && episodes.some((episode) => episode.id === episodeId)
          ? episodeId
          : episodes[0].id;
      episodeUrl = await EpisodeService.getStreamUrl(currentEpisodeId);
    }
  } catch (error) {
    console.error("Failed to fetch series details", error);
    return notFound();
  }

  if (!seasons?.length) {
    return (
      <div className={styles.container}>
        <TitleInfo title={title} />
        <div className={styles.noContent}>No seasons found for this series.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <JsonLd data={title} />
      <TitleInfo title={title} />
      <SeriesDetailsClient
        seasons={seasons}
        episodes={episodes}
        initialEpisodeUrl={episodeUrl}
        initialEpisodeId={currentEpisodeId}
        currentSeasonId={currentSeasonId}
      />
    </div>
  );
}
