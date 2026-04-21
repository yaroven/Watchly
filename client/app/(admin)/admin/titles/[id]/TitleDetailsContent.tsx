"use client";

import useEpisodes from "@/features/episodes/api/use-episodes";
import EpisodeManager from "@/features/episodes/components/EpisodeManager";
import VideoPreviewModal from "@/features/player/components/VideoPreviewModal";
import useSeasons from "@/features/season/api/use-seasons";
import SeasonManager from "@/features/season/components/SeasonManager";
import { Season } from "@/features/season/schemas/season";
import useTitle from "@/features/title/api/use-title";
import { useDeleteTitle, useTranscodeTitle } from "@/features/title/api/use-title-mutations";
import useTitleStreamUrl from "@/features/title/api/use-title-stream-url";
import TitleForm from "@/features/title/components/TitleForm";
import { Title, TitleType } from "@/features/title/schemas/title";
import TranscodingStatus from "@/types/transcoding-status";
import { Play, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DeleteModal from "./components/DeleteModal";
import styles from "./page.module.scss";

interface TitleDetailsContentProps {
  title: Title;
  initialSeasons: Season[];
}

export default function TitleDetailsContent({ title, initialSeasons }: TitleDetailsContentProps) {
  const router = useRouter();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: titleData } = useTitle(title.id, { initialData: title });

  const { data: seasons } = useSeasons(title.id, {
    enabled: titleData?.type === TitleType.SERIES,
    initialData: initialSeasons,
  });

  const { data: episodes } = useEpisodes(selectedSeasonId!, { enabled: !!selectedSeasonId });

  const currentTranscodingStatus = titleData?.transcodingStatus ?? title.transcodingStatus;

  const { isPending: isTranscoding, mutateAsync: restartTranscoding } = useTranscodeTitle();

  const { isPending: isDeleting, mutateAsync: deleteTitle } = useDeleteTitle({
    onSuccess: () => {
      setIsDeleteModalOpen(false);
      router.push("/admin/titles");
    },
  });

  const openPreviewModal = () => setIsPreviewModalOpen(true);
  const closePreviewModal = () => setIsPreviewModalOpen(false);
  const openDeleteModal = () => setIsDeleteModalOpen(true);
  const closeDeleteModal = () => setIsDeleteModalOpen(false);

  const { data: streamUrl } = useTitleStreamUrl(title.id, {
    enabled: isPreviewModalOpen && currentTranscodingStatus === TranscodingStatus.COMPLETED,
  });

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.pageTitle}>Manage Title</h1>
          <p className={styles.pageSubtitle}>
            Update metadata, review the stream, and manage seasons or episodes from one screen.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button onClick={openDeleteModal} className={styles.deleteButton} disabled={isDeleting}>
            Delete Title
          </button>

          {titleData?.type === TitleType.MOVIE && (
            <>
              {currentTranscodingStatus === TranscodingStatus.FAILED && (
                <button
                  onClick={() => restartTranscoding(title.id)}
                  className={styles.transcodeButton}
                  disabled={isTranscoding}
                >
                  <RotateCcw size={16} />
                  {isTranscoding ? "Restarting..." : "Restart Transcoding"}
                </button>
              )}

              {currentTranscodingStatus === TranscodingStatus.COMPLETED && (
                <button onClick={openPreviewModal} className={styles.previewButton}>
                  <Play size={16} /> Preview
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Details</h2>
              <p>Edit the primary metadata for this title.</p>
            </div>
            <TitleForm initialData={titleData} />
          </div>
        </div>

        {titleData?.type === TitleType.SERIES && (
          <div className={styles.contentColumn}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Seasons</h2>
                <p>Organize the structure of your series before managing episodes.</p>
              </div>
              <SeasonManager
                seasons={seasons || []}
                titleId={title.id}
                selectedSeasonId={selectedSeasonId}
                onSelectSeason={setSelectedSeasonId}
              />
            </div>

            {selectedSeasonId && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Episodes</h2>
                  <p>Manage the episode list and uploads for the selected season.</p>
                </div>
                <EpisodeManager seasonId={selectedSeasonId} episodes={episodes || []} />
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        titleName={(titleData || title).name}
        isDeleting={isDeleting}
        onConfirm={async () => deleteTitle(title.id)}
      />

      <VideoPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={closePreviewModal}
        streamUrl={streamUrl}
        title={titleData?.name || title.name}
        isLoading={isPreviewModalOpen && !streamUrl}
      />
    </div>
  );
}
