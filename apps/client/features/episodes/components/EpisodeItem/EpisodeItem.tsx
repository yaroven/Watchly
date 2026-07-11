import TranscodingStatus from "@/types/transcoding-status";

import styles from "./EpisodeItem.module.scss";

interface EpisodeItemProps {
  number: number;
  name: string;
  transcodingStatus: TranscodingStatus;
  isActive: boolean;
  onClick: () => void;
}

function getStatusLabel(status: TranscodingStatus) {
  switch (status) {
    case TranscodingStatus.PROCESSING:
      return "Processing";
    case TranscodingStatus.PENDING:
      return "Pending";
    case TranscodingStatus.FAILED:
      return "Failed";
    default:
      return null;
  }
}

export default function EpisodeItem({ number, name, transcodingStatus, isActive, onClick }: EpisodeItemProps) {
  const isAvailable = transcodingStatus === TranscodingStatus.COMPLETED;
  const statusLabel = isAvailable ? null : getStatusLabel(transcodingStatus);

  return (
    <button
      type="button"
      className={`${styles.episodeContainer} ${isActive ? styles.active : ""} ${!isAvailable ? styles.unavailable : ""}`}
      onClick={onClick}
      disabled={!isAvailable}
      aria-current={isActive ? "true" : undefined}
    >
      <span className={styles.episodeNumber}>E{number}</span>
      <span className={styles.episodeName}>{name}</span>
      {statusLabel && <span className={styles.episodeStatus}>{statusLabel}</span>}
    </button>
  );
}
