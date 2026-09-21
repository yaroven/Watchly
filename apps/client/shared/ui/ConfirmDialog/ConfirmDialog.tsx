"use client";

import {
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  ReportProblem as ReportProblemIcon,
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import Modal from "@shared/ui/Modal";
import type { ReactNode } from "react";

export type ConfirmTone = "danger" | "warning" | "info" | "success";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Body copy — a node, so callers can emphasise the item name. */
  description: ReactNode;
  /** Picks the icon and accent; also makes the confirm button red on danger. */
  tone?: ConfirmTone;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
}

/** Confirmation dialog for actions that need a deliberate yes. */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  tone = "danger",
  confirmLabel = "Confirm",
  pendingLabel,
  cancelLabel = "Cancel",
  isPending = false,
}: ConfirmDialogProps) {
  const { Icon, color, tint } = TONES[tone];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "18px",
          color: "#ffffff",
        }}
      >
        <Box
          sx={{
            width: 58,
            height: 58,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "18px",
            backgroundColor: tint,
          }}
        >
          <Icon sx={{ fontSize: "28px", color }} />
        </Box>

        <Typography sx={{ fontSize: "24px", fontWeight: 700 }}>{title}</Typography>

        <Typography sx={{ fontSize: "14px", color: "#999999", lineHeight: 1.5, "& strong": { color: "#ffffff" } }}>
          {description}
        </Typography>

        <Box sx={{ display: "flex", gap: "12px", width: "100%", mt: "6px" }}>
          <Button variant="outlined" onClick={onClose} disabled={isPending} sx={{ flex: 1 }}>
            {cancelLabel}
          </Button>
          <Button danger={tone === "danger"} onClick={onConfirm} disabled={isPending} sx={{ flex: 1 }}>
            {isPending && pendingLabel ? pendingLabel : confirmLabel}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

const TONES = {
  danger: { Icon: ReportProblemIcon, color: "#f64e34", tint: "rgba(246,78,52,.16)" },
  warning: { Icon: WarningAmberIcon, color: "#eb8509", tint: "rgba(235,133,9,.16)" },
  info: { Icon: InfoIcon, color: "#275bc2", tint: "rgba(39,91,194,.18)" },
  success: { Icon: CheckCircleIcon, color: "#27c237", tint: "rgba(39,194,55,.16)" },
} as const;
