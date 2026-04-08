"use client";
import { Episode } from "@/app/types/episode";
import { Plus } from "lucide-react";
import VideoPreviewModal from "../../shared/VideoPreviewModal";
import styles from "./EpisodeManager.module.scss";
import DeleteModal from "./components/DeleteModal";
import EpisodeItem from "./components/EpisodeItem";
import EpisodeModal from "./components/EpisodeModal";
import { EpisodeManagerProvider, useEpisodeManagerContext } from "./context/EpisodeManagerContext";

interface EpisodeManagerProps {
  titleId: string;
  seasonId: string;
  episodes: Episode[];
}

export default function EpisodeManager({ titleId, seasonId, episodes }: EpisodeManagerProps) {
  return (
    <EpisodeManagerProvider titleId={titleId} seasonId={seasonId} episodes={episodes}>
      <div className={styles.container}>
        <EpisodeManagerHeader />
        <EpisodeList episodes={episodes} />
        <EpisodeModal />
        <DeleteModalWrapper />
        <VideoPreviewModalWrapper />
      </div>
    </EpisodeManagerProvider>
  );
}

function DeleteModalWrapper() {
  const {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    episodeToDelete,
    handleConfirmDelete,
    deleteMutation,
  } = useEpisodeManagerContext();

  return (
    <DeleteModal
      isOpen={isDeleteModalOpen}
      onClose={() => setIsDeleteModalOpen(false)}
      title={episodeToDelete ? `Episode ${episodeToDelete.number}: ${episodeToDelete.name}` : ""}
      onConfirm={handleConfirmDelete}
      isDeleting={deleteMutation.isPending}
    />
  );
}

function EpisodeManagerHeader() {
  const { openCreate } = useEpisodeManagerContext();
  return (
    <div className={styles.header}>
      <h3>Episodes</h3>
      <button onClick={openCreate} className={styles.addButton}>
        <Plus size={16} /> Add Episode
      </button>
    </div>
  );
}

function EpisodeList({ episodes }: { episodes: Episode[] }) {
  return (
    <div className={styles.list}>
      {episodes.map((episode) => (
        <EpisodeItem key={episode.id} episode={episode} />
      ))}
    </div>
  );
}

function VideoPreviewModalWrapper() {
  const {
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    previewStreamUrl,
    previewItemName,
    isPreviewLoading,
  } = useEpisodeManagerContext();

  return (
    <VideoPreviewModal
      isOpen={isPreviewModalOpen}
      onClose={() => setIsPreviewModalOpen(false)}
      streamUrl={previewStreamUrl}
      title={previewItemName}
      isLoading={isPreviewLoading}
    />
  );
}
