import JsonLd from "@/app/components/shared/JsonLd";
import TitleInfo from "@/app/components/ui/TitleInfo";
import { EpisodeService } from "@/app/services/episode.service";
import { SeasonService } from "@/app/services/season.service";
import { TitleService } from "@/app/services/title.service";
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
    currentSeasonId = seasonId || seasons[0]?.id || "";

    if (currentSeasonId) {
      episodes = await EpisodeService.getAll(currentSeasonId);
    }

    if (episodes.length > 0) {
      currentEpisodeId = episodeId || episodes[0].id;
      const rawUrl = await EpisodeService.getStreamUrl(currentEpisodeId);
      episodeUrl = rawUrl.replace("localstack", "localhost");
    }
  } catch (error) {
    console.error("Failed to fetch series details", error);
    return notFound();
  }

  if (!seasons.length) {
    return (
      <div className={styles.container}>
        <TitleInfo id={id} initialData={title} />
        <div className={styles.noContent}>No seasons found for this series.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <JsonLd data={title} />
      <TitleInfo id={id} initialData={title} />
      <SeriesDetailsClient
        seasons={seasons}
        episodes={episodes}
        episodeUrl={episodeUrl}
        currentSeasonId={currentSeasonId}
        currentEpisodeId={currentEpisodeId}
      />
    </div>
  );
}
