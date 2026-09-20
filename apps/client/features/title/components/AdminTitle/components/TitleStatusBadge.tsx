"use client";

import TranscodingStatus from "@/types/transcoding-status";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import GppMaybeIcon from "@mui/icons-material/GppMaybe";
import type { ChipProps } from "@mui/material/Chip";
import Chip from "@mui/material/Chip";

interface TitleStatusBadgeProps {
  status: TranscodingStatus;
}

export default function TitleStatusBadge({ status }: TitleStatusBadgeProps) {
  const { label, color, icon } = getStatusMeta(status);

  return <Chip size="small" label={label} color={color} icon={icon} />;
}

function getStatusMeta(status: TranscodingStatus): { label: string; color: ChipProps["color"]; icon?: React.ReactElement } {
  switch (status) {
    case TranscodingStatus.COMPLETED:
      return { label: "Published", color: "success", icon: <CheckCircleIcon sx={{ fontSize: "14px !important" }} /> };
    case TranscodingStatus.PROCESSING:
      return {
        label: "Processing",
        color: "info",
        icon: (
          <AutorenewIcon
            sx={{
              fontSize: "14px !important",
              "@keyframes spin": { to: { transform: "rotate(360deg)" } },
              animation: "spin 1.5s linear infinite",
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          />
        ),
      };
    case TranscodingStatus.FAILED:
      return { label: "Failed", color: "error", icon: <GppMaybeIcon sx={{ fontSize: "14px !important" }} /> };
    case TranscodingStatus.PENDING:
    default:
      return { label: "Pending", color: "default", icon: <FiberManualRecordIcon sx={{ fontSize: "10px !important" }} /> };
  }
}
