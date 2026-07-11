"use client";
import { Season } from "@/features/season/schemas/season";
import { Plus } from "lucide-react";
import styles from "./SeasonManager.module.scss";
import DeleteModal from "./components/DeleteModal/DeleteModal";
import SeasonItem from "./components/SeasonItem/SeasonItem";
import SeasonModal from "./components/SeasonModal/SeasonModal";
import { SeasonManagerProvider, useSeasonManagerContext } from "./context/SeasonManagerContext";

interface SeasonManagerProps {
  seasons: Season[];
  titleId: string;
  onSelectSeason: (seasonId: string) => void;
  selectedSeasonId?: string;
}

export default function SeasonManager({ seasons, titleId, onSelectSeason, selectedSeasonId }: SeasonManagerProps) {
  return (
    <SeasonManagerProvider seasons={seasons} titleId={titleId}>
      <div className={styles.container}>
        <SeasonManagerHeader />
        <SeasonList seasons={seasons} selectedSeasonId={selectedSeasonId} onSelectSeason={onSelectSeason} />
        <SeasonModal />
        <DeleteModalWrapper />
      </div>
    </SeasonManagerProvider>
  );
}

function SeasonManagerHeader() {
  const { openCreate } = useSeasonManagerContext();
  return (
    <div className={styles.header}>
      <h3>Seasons</h3>
      <button onClick={openCreate} className={styles.addButton}>
        <Plus size={16} /> Add Season
      </button>
    </div>
  );
}

function SeasonList({
  seasons,
  selectedSeasonId,
  onSelectSeason,
}: {
  seasons: Season[];
  selectedSeasonId?: string;
  onSelectSeason: (seasonId: string) => void;
}) {
  return (
    <div className={styles.list}>
      {seasons.map((season) => (
        <SeasonItem key={season.id} season={season} isSelected={selectedSeasonId === season.id} onSelect={onSelectSeason} />
      ))}
    </div>
  );
}

function DeleteModalWrapper() {
  const { isDeleteModalOpen, closeDeleteModal, seasonToDelete, handleConfirmDelete, deleteMutation } = useSeasonManagerContext();

  return (
    <DeleteModal
      isOpen={isDeleteModalOpen}
      onClose={closeDeleteModal}
      title={seasonToDelete ? `Season ${seasonToDelete.number}: ${seasonToDelete.name}` : ""}
      onConfirm={handleConfirmDelete}
      isDeleting={deleteMutation.isPending}
    />
  );
}
