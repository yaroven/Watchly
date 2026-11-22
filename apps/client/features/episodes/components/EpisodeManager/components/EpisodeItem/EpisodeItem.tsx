import { Episode } from "@/features/episodes/schemas/episode";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import { MissingTranslation } from "@shared/ui/LocalePicker";
import { useTranslations } from "next-intl";
import { useEpisodeManagerContext } from "../../context/EpisodeManagerContext";

interface EpisodeItemProps {
  episode: Episode;
  isUntranslated?: boolean;
}

export default function EpisodeItem({ episode, isUntranslated = false }: EpisodeItemProps) {
  const { openPreview, openEdit, openDelete } = useEpisodeManagerContext();
  const t = useTranslations("episodes.item");
  const label = { number: episode.number, name: episode.name };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px",
        borderRadius: "12px",
        border: `1px solid ${tokens.border.subtle}`,
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        transition: "background-color .15s ease-out",
        "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" },
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
          #{episode.number}
        </Box>
        <Typography sx={{ fontWeight: 500, color: tokens.text.primary }}>{episode.name}</Typography>
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
          onClick={() => openPreview(episode)}
          aria-label={t("preview", label)}
          sx={{ color: "text.secondary", "&:hover": { color: tokens.text.primary } }}
        >
          <PlayArrowIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => openEdit(episode)}
          aria-label={t("edit", label)}
          sx={{ color: "text.secondary", "&:hover": { color: tokens.text.primary } }}
        >
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton size="small" color="error" onClick={() => openDelete(episode)} aria-label={t("delete", label)}>
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
