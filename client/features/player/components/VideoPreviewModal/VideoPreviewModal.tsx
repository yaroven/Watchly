"use client";

import CustomVideoPlayer from "@/features/player/components/CustomVideoPlayer";
import Modal from "@/shared/ui/Modal";
import { LoaderCircle } from "lucide-react";
import styles from "./VideoPreviewModal.module.scss";

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamUrl?: string;
  title?: string;
  isLoading?: boolean;
}

export default function VideoPreviewModal({
  isOpen,
  onClose,
  streamUrl,
  title,
  isLoading,
}: VideoPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className={styles.container}>
        <div className={styles.header}>
          <h3>{title || "Preview"}</h3>
        </div>
        <div className={styles.playerWrapper}>
          {isLoading ? (
            <div className={styles.loaderWrapper}>
              <LoaderCircle className={styles.loader} size={48} />
              <p>Fetching stream URL...</p>
            </div>
          ) : streamUrl ? (
            <CustomVideoPlayer src={streamUrl} />
          ) : (
            <div className={styles.error}>Could not load video stream</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
