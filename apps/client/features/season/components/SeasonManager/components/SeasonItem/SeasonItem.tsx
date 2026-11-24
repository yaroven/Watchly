"use client";

import { Season } from "@/features/season/schemas/season";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import { MissingTranslation } from "@shared/ui/LocalePicker";
import { useTranslations } from "next-intl";
import { useSeasonManagerContext } from "../../context/SeasonManagerContext";

interface SeasonItemProps {
  season: Season;
  isSelected: boolean;
  onSelect: (seasonId: string) => void;
  isUntranslated?: boolean;
}

export default function SeasonItem({ season, isSelected, onSelect, isUntranslated = false }: SeasonItemProps) {
  const { openEdit, openDelete } = useSeasonManagerContext();
  const t = useTranslations("season.item");
  const label = { number: season.number, name: season.name };

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={t("select", label)}
      onClick={() => onSelect(season.id)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(season.id);
        }
      }}
      sx={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px 10px 18px",
        borderRadius: "12px",
        cursor: "pointer",
        border: "1px solid",
        borderColor: isSelected ? "primary.main" : tokens.border.subtle,
        backgroundColor: isSelected ? "rgba(231, 188, 15, 0.12)" : "rgba(255, 255, 255, 0.02)",
        transition: "background-color .15s ease-out, border-color .15s ease-out",
        "&:hover": {
          backgroundColor: isSelected ? "rgba(231, 188, 15, 0.16)" : "rgba(255, 255, 255, 0.05)",
        },
        "&:focus-visible": {
          outline: `2px solid ${tokens.accent.primary}`,
          outlineOffset: "2px",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "30px",
            height: "20px",
            px: "6px",
            borderRadius: "6px",
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            fontSize: "11px",
            fontWeight: 700,
            color: "text.secondary",
          }}
        >
          #{season.number}
        </Box>
        <Typography sx={{ fontWeight: 500, color: tokens.text.primary }}>{season.name}</Typography>
        {isUntranslated && <MissingTranslation />}
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          borderRadius: "999px",
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          padding: "2px",
        }}
      >
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            openEdit(season);
          }}
          aria-label={t("edit", label)}
          sx={{ color: "text.secondary", "&:hover": { color: tokens.text.primary } }}
        >
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={(e) => {
            e.stopPropagation();
            openDelete(season);
          }}
          aria-label={t("delete", label)}
        >
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
