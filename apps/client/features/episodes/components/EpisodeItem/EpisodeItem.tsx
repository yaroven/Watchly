import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import TranscodingStatus from "@/types/transcoding-status";
import StarIcon from "@mui/icons-material/Star";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";

interface EpisodeItemProps {
  number: number;
  name: string;
  transcodingStatus: TranscodingStatus;
  isActive: boolean;
  onClick: () => void;
  thumbnailUrl?: string;
  score?: number;
}

function getStatusLabelKey(status: TranscodingStatus) {
  switch (status) {
    case TranscodingStatus.PROCESSING:
      return "status.processing";
    case TranscodingStatus.PENDING:
      return "status.pending";
    case TranscodingStatus.FAILED:
      return "status.failed";
    default:
      return null;
  }
}

export default function EpisodeItem({ number, name, transcodingStatus, isActive, onClick, thumbnailUrl, score }: EpisodeItemProps) {
  const t = useTranslations("episodes");
  const format = useFormatter();
  const isAvailable = transcodingStatus === TranscodingStatus.COMPLETED;
  const statusLabelKey = isAvailable ? null : getStatusLabelKey(transcodingStatus);
  const statusLabel = statusLabelKey ? t(statusLabelKey) : null;
  const thumbnailSrc = getOptimizedImageSrc(thumbnailUrl);

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={!isAvailable}
      aria-label={t("episodeTitle", { number, name })}
      aria-current={isActive ? "true" : undefined}
      sx={{
        position: "relative",
        width: "195px",
        aspectRatio: "195 / 237",
        flexShrink: 0,
        borderRadius: "12px",
        overflow: "hidden",
        border: "2px solid",
        borderColor: isActive ? "primary.main" : "transparent",
        cursor: isAvailable ? "pointer" : "not-allowed",
        opacity: isAvailable ? 1 : 0.5,
        font: "inherit",
        padding: 0,
        backgroundColor: "#333333",
      }}
    >
      <Image src={thumbnailSrc} alt="" fill sizes="195px" style={{ objectFit: "cover" }} />

      {score !== undefined && (
        <Box
          sx={{
            position: "absolute",
            top: "12px",
            left: "12px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            px: "8px",
            py: "3px",
            borderRadius: "8px",
            backgroundColor: "#333333",
          }}
        >
          <StarIcon sx={{ fontSize: "14px", color: "primary.main" }} />
          <Typography component="span" sx={{ fontSize: "12px", fontWeight: 600, color: "#ffffff" }}>
            {format.number(score, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </Typography>
          <Typography component="span" sx={{ fontSize: "10px", color: "text.secondary" }}>
            /10
          </Typography>
        </Box>
      )}

      {statusLabel && (
        <Box
          sx={{
            position: "absolute",
            top: "12px",
            right: "12px",
            px: "8px",
            py: "3px",
            borderRadius: "8px",
            backgroundColor: "rgba(0,0,0,.6)",
          }}
        >
          <Typography component="span" sx={{ fontSize: "11px", color: "#ffffff" }}>
            {statusLabel}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          px: "12px",
          py: "10px",
          textAlign: "left",
          background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.85) 100%)",
        }}
      >
        <Typography
          component="span"
          sx={{
            display: "block",
            fontSize: "14px",
            fontWeight: 600,
            color: "#ffffff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </Typography>
      </Box>
    </Box>
  );
}
