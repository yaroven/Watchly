"use client";

import {
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  ReportProblem as ReportProblemIcon,
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import Modal from "@shared/ui/Modal";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export type ConfirmTone = "danger" | "warning" | "info" | "success";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  tone?: ConfirmTone;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  error?: string | null;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  tone = "danger",
  confirmLabel,
  pendingLabel,
  cancelLabel,
  isPending = false,
  error,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
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
          color: tokens.text.primary,
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

        <Typography sx={{ fontSize: "14px", color: tokens.text.secondary, lineHeight: 1.5, "& strong": { color: tokens.text.primary } }}>
          {description}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: "100%", textAlign: "start" }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: "12px", width: "100%", mt: "6px" }}>
          <Button variant="outlined" onClick={onClose} disabled={isPending} sx={{ flex: 1 }}>
            {cancelLabel ?? t("cancel")}
          </Button>
          <Button danger={tone === "danger"} onClick={onConfirm} disabled={isPending} sx={{ flex: 1 }}>
            {isPending && pendingLabel ? pendingLabel : (confirmLabel ?? t("confirm"))}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

const TONES = {
  danger: { Icon: ReportProblemIcon, color: tokens.feedback.error, tint: alpha(tokens.feedback.error, 0.16) },
  warning: { Icon: WarningAmberIcon, color: tokens.feedback.warning, tint: alpha(tokens.feedback.warning, 0.16) },
  info: { Icon: InfoIcon, color: tokens.feedback.info, tint: alpha(tokens.feedback.info, 0.18) },
  success: { Icon: CheckCircleIcon, color: tokens.feedback.success, tint: alpha(tokens.feedback.success, 0.16) },
} as const;
