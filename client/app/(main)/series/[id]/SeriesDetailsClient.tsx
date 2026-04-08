"use client";

import CustomVideoPlayer from "@/app/components/shared/CustomVideoPlayer";
import EpisodeList from "@/app/components/ui/EpisodeList";
import SeasonTabs from "@/app/components/ui/SeasonTabs";
import { Episode } from "@/app/types/episode";
import { Season } from "@/app/types/season";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
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
  const [, startTransition] = useTransition();

  const handleEpisodeChange = (id: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("episode", id);
    startTransition(() => {
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    });
  };

  const handleSeasonChange = (id: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("season", id);
    newParams.delete("episode");
    startTransition(() => {
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    });
  };

  return (
    <>
      <CustomVideoPlayer src={episodeUrl} />
      {episodes?.length ? (
        <EpisodeList
          episodes={episodes}
          onClick={handleEpisodeChange}
          currentEpisodeId={currentEpisodeId}
        />
      ) : (
        <div className={styles.noContent}>Episodes for this season not added yet</div>
      )}
      {seasons?.length > 0 && (
        <SeasonTabs
          onClick={handleSeasonChange}
          seasons={seasons}
          currentSeasonId={currentSeasonId}
        />
      )}
    </>
  );
}
