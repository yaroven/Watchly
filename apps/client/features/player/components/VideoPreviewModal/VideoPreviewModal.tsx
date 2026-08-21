"use client";

import CustomVideoPlayer from "@/features/player/components/CustomVideoPlayer";
import Modal from "@/shared/ui/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { LoaderCircle } from "lucide-react";

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamUrl?: string;
  title?: string;
  isLoading?: boolean;
}

export default function VideoPreviewModal({ isOpen, onClose, streamUrl, title, isLoading }: VideoPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <Box sx={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <Typography sx={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", pr: "44px" }}>{title || "Preview"}</Typography>

        <Box
          sx={{
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: "#111111",
            minHeight: 260,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isLoading ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: "#999999" }}>
              <Box
                sx={{
                  display: "flex",
                  "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                  animation: "spin 1s linear infinite",
                  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                }}
              >
                <LoaderCircle size={48} color="#e7bc0f" />
              </Box>
              <Typography sx={{ fontSize: "14px" }}>Fetching stream URL...</Typography>
            </Box>
          ) : streamUrl ? (
            <CustomVideoPlayer src={streamUrl} />
          ) : (
            <Typography sx={{ fontSize: "14px", color: "#f64e34" }}>Could not load video stream</Typography>
          )}
        </Box>
      </Box>
    </Modal>
  );
}
