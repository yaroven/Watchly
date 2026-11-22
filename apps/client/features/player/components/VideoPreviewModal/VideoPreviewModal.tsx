"use client";

import CustomVideoPlayer from "@/features/player/components/CustomVideoPlayer";
import Modal from "@/shared/ui/Modal";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import { useTranslations } from "next-intl";

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamUrl?: string;
  title?: string;
  isLoading?: boolean;
}

export default function VideoPreviewModal({ isOpen, onClose, streamUrl, title, isLoading }: VideoPreviewModalProps) {
  const t = useTranslations("player");

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <Box sx={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <Typography sx={{ fontSize: "24px", fontWeight: 700, color: tokens.text.primary, pr: "44px" }}>
          {title || t("preview.title")}
        </Typography>

        <Box
          sx={{
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: tokens.surface.dropzone,
            minHeight: 260,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isLoading ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: tokens.text.secondary }}>
              <Box
                sx={{
                  display: "flex",
                  "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                  animation: "spin 1s linear infinite",
                  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                }}
              >
                <AutorenewIcon sx={{ fontSize: 48, color: tokens.accent.primary }} />
              </Box>
              <Typography sx={{ fontSize: "14px" }}>{t("preview.loading")}</Typography>
            </Box>
          ) : streamUrl ? (
            <CustomVideoPlayer src={streamUrl} />
          ) : (
            <Typography sx={{ fontSize: "14px", color: tokens.feedback.error }}>{t("preview.error")}</Typography>
          )}
        </Box>
      </Box>
    </Modal>
  );
}
