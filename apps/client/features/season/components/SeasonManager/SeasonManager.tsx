"use client";
import useSeasons from "@/features/season/api/use-seasons";
import { Season } from "@/features/season/schemas/season";
import AddIcon from "@mui/icons-material/Add";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { useEditingLanguage } from "@shared/lib/editing-language";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import { useTranslations } from "next-intl";
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
        <SeasonList titleId={titleId} seasons={seasons} selectedSeasonId={selectedSeasonId} onSelectSeason={onSelectSeason} />
        <SeasonModal />
        <DeleteModalWrapper />
      </Box>
    </SeasonManagerProvider>
  );
}

function SeasonManagerHeader() {
  const t = useTranslations("season");
  const { openCreate } = useSeasonManagerContext();
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Typography component="h3" variant="h6" sx={{ color: tokens.text.primary, fontWeight: 700 }}>
        {t("manager.heading")}
      </Typography>
      <Button variant="outlined" size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={openCreate}>
        {t("manager.add")}
      </Button>
    </Box>
  );
}

function SeasonList({
  titleId,
  seasons,
  selectedSeasonId,
  onSelectSeason,
}: {
  titleId: string;
  seasons: Season[];
  selectedSeasonId?: string;
  onSelectSeason: (seasonId: string) => void;
}) {
  const t = useTranslations("season");
  const { translationLocale } = useEditingLanguage();
  const { data: localized } = useSeasons(titleId, { enabled: !!translationLocale, contentLocale: translationLocale ?? undefined });
  const untranslated = new Set(
    translationLocale ? (localized ?? []).filter((season) => season.content.fallback).map((season) => season.id) : [],
  );

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
        <InboxOutlinedIcon sx={{ fontSize: 28, color: tokens.border.faint }} />
        <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>{t("manager.empty")}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {seasons.map((season) => (
        <SeasonItem
          key={season.id}
          season={season}
          isSelected={selectedSeasonId === season.id}
          onSelect={onSelectSeason}
          isUntranslated={untranslated.has(season.id)}
        />
      ))}
    </Box>
  );
}

function DeleteModalWrapper() {
  const describeError = useApiErrorMessage();
  const t = useTranslations("season");
  const { isDeleteModalOpen, closeDeleteModal, seasonToDelete, handleConfirmDelete, deleteMutation } = useSeasonManagerContext();

  return (
    <DeleteModal
      isOpen={isDeleteModalOpen}
      onClose={closeDeleteModal}
      title={seasonToDelete ? t("seasonTitle", { number: seasonToDelete.number, name: seasonToDelete.name }) : ""}
      onConfirm={handleConfirmDelete}
      isDeleting={deleteMutation.isPending}
      error={describeError(deleteMutation.error)}
    />
  );
}
