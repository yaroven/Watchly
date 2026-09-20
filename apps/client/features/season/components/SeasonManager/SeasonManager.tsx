"use client";
import { Season } from "@/features/season/schemas/season";
import AddIcon from "@mui/icons-material/Add";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", height: "100%" }}>
        <SeasonManagerHeader />
        <SeasonList seasons={seasons} selectedSeasonId={selectedSeasonId} onSelectSeason={onSelectSeason} />
        <SeasonModal />
        <DeleteModalWrapper />
      </Box>
    </SeasonManagerProvider>
  );
}

function SeasonManagerHeader() {
  const { openCreate } = useSeasonManagerContext();
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Typography component="h3" variant="h6" sx={{ color: "#ffffff", fontWeight: 700 }}>
        Seasons
      </Typography>
      <Button variant="outlined" size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={openCreate}>
        Add Season
      </Button>
    </Box>
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
  if (seasons.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          py: "36px",
          color: "text.secondary",
        }}
      >
        <InboxOutlinedIcon sx={{ fontSize: 28, color: "#444444" }} />
        <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>No seasons yet. Add the first one to get started.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
      {seasons.map((season) => (
        <SeasonItem key={season.id} season={season} isSelected={selectedSeasonId === season.id} onSelect={onSelectSeason} />
      ))}
    </Box>
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
