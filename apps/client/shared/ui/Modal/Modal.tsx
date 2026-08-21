"use client";

import Close from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import type { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Dialog owns the focus trap, Escape handling, scroll lock and the portal,
 * so this only supplies the framing and the close button.
 */
export default function Modal({ children, isOpen, onClose, size = "md" }: ModalProps) {
  return (
    <Dialog
      open={isOpen}
      // Dialog calls onClose with (event, reason); the callers take no args.
      onClose={() => onClose()}
      // The widths below are the app's own, not MUI's breakpoint scale.
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            position: "relative",
            width: "95%",
            maxWidth: MAX_WIDTHS[size],
            backgroundColor: "#000000",
            backgroundImage: "none",
            borderRadius: "20px",
            border: "1px solid #333333",
            p: { xs: "26px 18px 22px", sm: "32px 32px 28px" },
          },
        },
        backdrop: { sx: { backgroundColor: "rgba(0,0,0,.7)" } },
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={onClose}
        aria-label="Close modal"
        sx={{
          position: "absolute",
          top: "16px",
          right: "16px",
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          border: "none",
          background: "#333333",
          color: "#e5e5e5",
          cursor: "pointer",
          opacity: 0.75,
          transition: "opacity .1s ease-in-out",
          ":hover": { opacity: 1 },
        }}
      >
        <Close sx={{ fontSize: "20px" }} />
      </Box>
      {children}
    </Dialog>
  );
}

const MAX_WIDTHS = { sm: 400, md: 600, lg: 800, xl: 1100 } as const;
