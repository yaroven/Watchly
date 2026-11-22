"use client";

import Close from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import { tokens } from "@shared/mui/theme";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";

interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  onExited?: () => void;
}

export default function Modal({ children, isOpen, onClose, size = "md", onExited }: ModalProps) {
  const t = useTranslations("shared.modal");
  const [closingContent, setClosingContent] = useState<ReactNode>(null);
  const [wasOpen, setWasOpen] = useState(isOpen);
  const [lastOpenContent, setLastOpenContent] = useState<ReactNode>(children);

  if (isOpen && lastOpenContent !== children) setLastOpenContent(children);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    setClosingContent(isOpen ? null : lastOpenContent);
  }
  return (
    <Dialog
      open={isOpen}
      onClose={() => onClose()}
      maxWidth={false}
      slotProps={{
        transition: {
          onExited: () => {
            setClosingContent(null);
            onExited?.();
          },
        },
        paper: {
          sx: {
            position: "relative",
            width: "95%",
            maxWidth: MAX_WIDTHS[size],
            backgroundColor: `var(--modal-bg, ${tokens.surface.paper})`,
            backgroundImage: "none",
            borderRadius: "var(--modal-radius, 20px)",
            border: `1px solid var(--modal-border, ${tokens.border.subtle})`,
            boxShadow: "var(--modal-shadow, none)",
            p: { xs: "26px 18px 22px", sm: "32px 32px 28px" },
          },
        },
        backdrop: { sx: { backgroundColor: "var(--modal-backdrop, rgba(0,0,0,.7))" } },
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={onClose}
        aria-label={t("close")}
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
          background: `var(--modal-close-bg, ${tokens.surface.fill})`,
          color: `var(--modal-close-color, ${tokens.text.field})`,
          cursor: "pointer",
          opacity: 0.75,
          transition: "opacity .1s ease-in-out, background-color .15s ease-out",
          ":hover": { opacity: 1, background: `var(--modal-close-hover-bg, ${tokens.surface.fill})` },
          ":focus-visible": { opacity: 1, outline: `2px solid var(--modal-focus, ${tokens.accent.primary})`, outlineOffset: "2px" },
        }}
      >
        <Close sx={{ fontSize: "20px" }} />
      </Box>
      {isOpen ? children : closingContent}
    </Dialog>
  );
}

const MAX_WIDTHS = { sm: 400, md: 600, lg: 800, xl: 1100 } as const;
