"use client";

import { deleteTitleAction } from "@/app/actions/title.actions";
import EpisodeManager from "@/app/components/admin/EpisodeManager";
import SeasonManager from "@/app/components/admin/SeasonManager";
import TitleForm from "@/app/components/admin/TitleForm";
import VideoPreviewModal from "@/app/components/shared/VideoPreviewModal";
import { EpisodeService } from "@/app/services/episode.service";
import { SeasonService } from "@/app/services/season.service";
import { TitleService } from "@/app/services/title.service";
import { Episode } from "@/app/types/episode";
import { Season } from "@/app/types/season";
import { Title, TitleType } from "@/app/types/title";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import DeleteModal from "./components/DeleteModal";
import styles from "./page.module.scss";

interface TitleDetailsContentProps {
  title: Title;
  initialSeasons: Season[];
}

export default function TitleDetailsContent({ title, initialSeasons }: TitleDetailsContentProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewStreamUrl, setPreviewStreamUrl] = useState<string | undefined>();
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: titleData } = useQuery<Title>({
    queryKey: ["title", title.id],
    queryFn: () => TitleService.getById(title.id),
    initialData: title,
  });

  const { data: seasons } = useQuery<Season[]>({
    queryKey: ["seasons", title.id],
    queryFn: () => SeasonService.getAll(title.id),
    enabled: titleData?.type === TitleType.SERIES,
    initialData: initialSeasons,
  });

  const { data: episodes } = useQuery<Episode[]>({
    queryKey: ["episodes", selectedSeasonId],
    queryFn: () => EpisodeService.getAll(selectedSeasonId!),
    enabled: !!selectedSeasonId,
  });

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteTitleAction(title.id);
        queryClient.invalidateQueries({ queryKey: ["adminTitles"] });
        queryClient.invalidateQueries({ queryKey: ["adminStats"] });
        queryClient.invalidateQueries({ queryKey: ["adminRecent"] });
        router.push("/admin/titles");
      } catch (err) {
        console.error("Failed to delete title", err);
        setIsDeleteModalOpen(false);
      }
    });
  };

  const handlePreview = async () => {
    setPreviewStreamUrl(undefined);
    setIsPreviewLoading(true);
    setIsPreviewModalOpen(true);
    try {
      const url = await TitleService.getStreamUrl(title.id);
      const fixedUrl = url.replace("localstack", "localhost");
      setPreviewStreamUrl(fixedUrl);
    } catch (err) {
      console.error("Failed to fetch stream URL", err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.pageTitle}>Manage Title</h1>
        </div>

        <div className={styles.headerActions}>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className={styles.deleteButton}
            disabled={isPending}
          >
            Delete Title
          </button>

          {titleData?.type === TitleType.MOVIE && (
            <button onClick={handlePreview} className={styles.previewButton}>
              <Play size={16} /> Preview Movie
            </button>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <div className={styles.card}>
            <h2>Details</h2>
            <TitleForm initialData={titleData} />
          </div>
        </div>

        {titleData?.type === TitleType.SERIES && (
          <div className={styles.contentColumn}>
            <div className={styles.card}>
              <SeasonManager
                titleId={title.id}
                seasons={seasons || []}
                selectedSeasonId={selectedSeasonId}
                onSelectSeason={setSelectedSeasonId}
              />
            </div>

            {selectedSeasonId && (
              <div className={styles.card}>
                <EpisodeManager
                  titleId={title.id}
                  seasonId={selectedSeasonId}
                  episodes={episodes || []}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteModal
        isDeleteModalOpen={isDeleteModalOpen}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
        title={titleData || title}
        isDeleting={isPending}
        handleDelete={async () => handleDelete()}
      />

      <VideoPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        streamUrl={previewStreamUrl}
        title={titleData?.name || title.name}
        isLoading={isPreviewLoading}
      />
    </div>
  );
}
