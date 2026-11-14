"use client";

import TranscodingStatus from "@/types/transcoding-status";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import GppMaybeIcon from "@mui/icons-material/GppMaybe";
import type { ChipProps } from "@mui/material/Chip";
import Chip from "@mui/material/Chip";
import { useTranslations } from "next-intl";

interface TitleStatusBadgeProps {
  status: TranscodingStatus;
}

export default function TitleStatusBadge({ status }: TitleStatusBadgeProps) {
  const t = useTranslations("title.admin.status");
  const { color, icon } = getStatusMeta(status);
  const label = t(status);

  return <Chip size="small" label={label} color={color} icon={icon} />;
}

function getStatusMeta(status: TranscodingStatus): { color: ChipProps["color"]; icon?: React.ReactElement } {
  switch (status) {
    case TranscodingStatus.COMPLETED:
      return { color: "success", icon: <CheckCircleIcon sx={{ fontSize: "14px !important" }} /> };
    case TranscodingStatus.PROCESSING:
      return {
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
      return { color: "error", icon: <GppMaybeIcon sx={{ fontSize: "14px !important" }} /> };
    case TranscodingStatus.PENDING:
    default:
      return { color: "default", icon: <FiberManualRecordIcon sx={{ fontSize: "10px !important" }} /> };
  }
}
