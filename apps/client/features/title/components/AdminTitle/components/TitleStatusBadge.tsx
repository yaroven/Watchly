"use client";

import TranscodingStatus from "@/types/transcoding-status";
import { LoaderCircle, ShieldAlert } from "lucide-react";
import styles from "../Title.module.scss";

interface TitleStatusBadgeProps {
  status: TranscodingStatus;
}

export default function TitleStatusBadge({ status }: TitleStatusBadgeProps) {
  const statusMeta = getStatusMeta(status);

  return (
    <span className={`${styles.statusBadge} ${styles[statusMeta.tone]}`}>
      {statusMeta.icon}
      {statusMeta.label}
    </span>
  );
}

function getStatusMeta(status: TranscodingStatus) {
  switch (status) {
    case TranscodingStatus.COMPLETED:
      return {
        label: "Published",
        tone: "completed",
        icon: <span className={styles.dot} />,
      };
    case TranscodingStatus.PROCESSING:
      return {
        label: "Processing",
        tone: "processing",
        icon: <LoaderCircle size={14} />,
      };
    case TranscodingStatus.FAILED:
      return {
        label: "Failed",
        tone: "failed",
        icon: <ShieldAlert size={14} />,
      };
    case TranscodingStatus.PENDING:
    default:
      return {
        label: "Pending",
        tone: "pending",
        icon: <span className={styles.dot} />,
      };
  }
}
