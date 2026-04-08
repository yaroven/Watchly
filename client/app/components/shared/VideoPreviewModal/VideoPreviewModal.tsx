"use client";

import CustomVideoPlayer from "@/app/components/shared/CustomVideoPlayer";
import Modal from "@/app/components/shared/Modal";
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
  const fixed = streamUrl?.replace("localstack", "localhost");
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
          ) : fixed ? (
            <CustomVideoPlayer src={fixed} />
          ) : (
            <div className={styles.error}>Could not load video stream</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
