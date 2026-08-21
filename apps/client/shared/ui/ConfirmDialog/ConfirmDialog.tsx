"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import Modal from "@shared/ui/Modal";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Body copy — a node, so callers can emphasise the item name. */
  description: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
}

/** Destructive confirmation shared by the delete flows. */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm Delete",
  pendingLabel = "Deleting...",
  isPending = false,
}: ConfirmDialogProps) {
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
            backgroundColor: "rgba(246,78,52,.16)",
          }}
        >
          <AlertTriangle size={28} color="#f64e34" />
        </Box>

        <Typography sx={{ fontSize: "24px", fontWeight: 700 }}>{title}</Typography>

        <Typography sx={{ fontSize: "14px", color: "#999999", lineHeight: 1.5, "& strong": { color: "#ffffff" } }}>
          {description}
        </Typography>

        <Box sx={{ display: "flex", gap: "12px", width: "100%", mt: "6px" }}>
          <Button variant="outlined" onClick={onClose} disabled={isPending} sx={{ flex: 1 }}>
            Cancel
          </Button>
          <Button danger onClick={onConfirm} disabled={isPending} sx={{ flex: 1 }}>
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
