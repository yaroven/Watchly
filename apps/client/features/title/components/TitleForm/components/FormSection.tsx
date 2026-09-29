"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import type { ReactNode } from "react";

export type SectionStatus = { label: string; tone: "done" | "todo" };

interface FormSectionProps {
  index: string;
  title: string;
  description: string;
  status?: SectionStatus;
  anchorId?: string;
  children: ReactNode;
}

export default function FormSection({ index, title, description, status, anchorId, children }: FormSectionProps) {
  return (
    <Box
      id={anchorId}
      sx={{
        backgroundColor: tokens.surface.paper,
        border: `1px solid ${tokens.border.subtle}`,
        borderRadius: "12px",
        overflow: "hidden",
        scrollMarginTop: "24px",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "16px", p: "20px 24px 16px" }}>
        <Typography component="span" sx={{ fontFamily: "var(--font-display)", fontSize: "30px", lineHeight: 1, color: "primary.main" }}>
          {index}
        </Typography>

        <Box sx={{ flexGrow: 1 }}>
          <Typography component="h2" sx={{ fontFamily: "var(--font-heading)", fontSize: "19px", fontWeight: 600, color: "#ffffff" }}>
            {title}
          </Typography>
          <Typography sx={{ mt: "3px", fontSize: "13px", color: "text.secondary" }}>{description}</Typography>
        </Box>

        {status && (
          <Typography
            sx={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
              color: status.tone === "done" ? tokens.feedback.success : tokens.feedback.warning,
            }}
          >
            {status.label}
          </Typography>
        )}
      </Box>

      <Box sx={{ borderTop: `1px dashed ${tokens.border.subtle}` }} />

      <Box sx={{ p: "22px 24px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>{children}</Box>
    </Box>
  );
}
