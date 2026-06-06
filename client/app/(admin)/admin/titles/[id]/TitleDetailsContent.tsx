"use client";

import EpisodeManager from "@/features/episodes/components/EpisodeManager";
import VideoPreviewModal from "@/features/player/components/VideoPreviewModal";
import SeasonManager from "@/features/season/components/SeasonManager";
import { Season } from "@/features/season/schemas/season";
import TitleForm from "@/features/title/components/TitleForm";
import { Title, TitleType } from "@/features/title/schemas/title";
import TranscodingStatus from "@/types/transcoding-status";
import { Play, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import DeleteModal from "./components/DeleteModal";
import styles from "./page.module.scss";
import { useTitleDetailsController } from "./useTitleDetailsController";

interface TitleDetailsContentProps {
  title: Title;
  initialSeasons: Season[];
}

export default function TitleDetailsContent({ title, initialSeasons }: TitleDetailsContentProps) {
  const {
    title: currentTitle,
    isSeries,
    seasons,
    episodes,
    selectedSeasonId,
    setSelectedSeasonId,
    currentTranscodingStatus,
    isPreviewModalOpen,
    openPreviewModal,
    closePreviewModal,
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal,
    isTranscoding,
    restartTranscoding,
    isDeleting,
    deleteTitle,
    streamUrl,
    isPreviewLoading,
  } = useTitleDetailsController({
    title,
    initialSeasons,
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

        <TitleDetailsActions
          title={currentTitle}
          currentTranscodingStatus={currentTranscodingStatus}
          isDeleting={isDeleting}
          isTranscoding={isTranscoding}
          onDelete={openDeleteModal}
          onPreview={openPreviewModal}
          onRestartTranscoding={() => restartTranscoding(title.id)}
        />
      </div>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <SectionCard
            title="Details"
            description="Edit the primary metadata for this title."
          >
            <TitleForm initialData={currentTitle} />
          </SectionCard>
        </div>

        {isSeries && (
          <SeriesManagementSection
            titleId={title.id}
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            onSelectSeason={setSelectedSeasonId}
            episodes={episodes}
          />
        )}
      </div>

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        titleName={currentTitle.name}
        isDeleting={isDeleting}
        onConfirm={async () => deleteTitle(title.id)}
      />

      <VideoPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={closePreviewModal}
        streamUrl={streamUrl}
        title={currentTitle.name}
        isLoading={isPreviewLoading}
      />
    </div>
  );
}

function TitleDetailsActions({
  title,
  currentTranscodingStatus,
  isDeleting,
  isTranscoding,
  onDelete,
  onPreview,
  onRestartTranscoding,
}: {
  title: Title;
  currentTranscodingStatus: TranscodingStatus;
  isDeleting: boolean;
  isTranscoding: boolean;
  onDelete: () => void;
  onPreview: () => void;
  onRestartTranscoding: () => void;
}) {
  return (
    <div className={styles.headerActions}>
      <button onClick={onDelete} className={styles.deleteButton} disabled={isDeleting}>
        Delete Title
      </button>

      {title.type === TitleType.MOVIE && currentTranscodingStatus === TranscodingStatus.FAILED && (
        <button
          onClick={onRestartTranscoding}
          className={styles.transcodeButton}
          disabled={isTranscoding}
        >
          <RotateCcw size={16} />
          {isTranscoding ? "Restarting..." : "Restart Transcoding"}
        </button>
      )}

      {title.type === TitleType.MOVIE &&
        currentTranscodingStatus === TranscodingStatus.COMPLETED && (
          <button onClick={onPreview} className={styles.previewButton}>
            <Play size={16} /> Preview
          </button>
        )}
    </div>
  );
}

function SeriesManagementSection({
  titleId,
  seasons,
  selectedSeasonId,
  onSelectSeason,
  episodes,
}: {
  titleId: string;
  seasons: Season[];
  selectedSeasonId?: string;
  onSelectSeason: (seasonId: string) => void;
  episodes: ReturnType<typeof useTitleDetailsController>["episodes"];
}) {
  return (
    <div className={styles.contentColumn}>
      <SectionCard
        title="Seasons"
        description="Organize the structure of your series before managing episodes."
      >
        <SeasonManager
          seasons={seasons}
          titleId={titleId}
          selectedSeasonId={selectedSeasonId}
          onSelectSeason={onSelectSeason}
        />
      </SectionCard>

      {selectedSeasonId && (
        <SectionCard
          title="Episodes"
          description="Manage the episode list and uploads for the selected season."
        >
          <EpisodeManager seasonId={selectedSeasonId} episodes={episodes} />
        </SectionCard>
      )}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
