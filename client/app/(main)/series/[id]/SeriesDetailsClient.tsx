"use client";

import EpisodeList from "@/features/episodes/components/EpisodeList";
import { Episode } from "@/features/episodes/schemas/episode";
import CustomVideoPlayer from "@/features/player/components/CustomVideoPlayer";
import SeasonTabs from "@/features/season/components/SeasonTabs";
import { Season } from "@/features/season/schemas/season";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.scss";

interface SeriesDetailsClientProps {
  seasons: Season[];
  episodes: Episode[];
  episodeUrl?: string;
  currentSeasonId: string;
  currentEpisodeId: string;
}

export default function SeriesDetailsClient({
  seasons,
  episodes,
  episodeUrl,
  currentSeasonId,
  currentEpisodeId,
}: SeriesDetailsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleEpisodeChange = (id: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("episode", id);
    router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
  };

  const handleSeasonChange = (id: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("season", id);
    newParams.delete("episode");
    router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
  };

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Now playing</h3>
            <p>Switch episodes without leaving the page.</p>
          </div>
        </div>
        {episodeUrl ? (
          <CustomVideoPlayer src={episodeUrl} />
        ) : (
          <div className={styles.noContent}>
            Video stream is not available for the selected episode yet.
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Episodes</h3>
        </div>
        {episodes?.length ? (
          <EpisodeList
            episodes={episodes}
            onClick={handleEpisodeChange}
            currentEpisodeId={currentEpisodeId}
          />
        ) : (
          <div className={styles.noContent}>Episodes for this season have not been added yet.</div>
        )}
      </section>

      {seasons?.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Seasons</h3>
          </div>
          <SeasonTabs
            onClick={handleSeasonChange}
            seasons={seasons}
            currentSeasonId={currentSeasonId}
          />
        </section>
      )}
    </>
  );
}
