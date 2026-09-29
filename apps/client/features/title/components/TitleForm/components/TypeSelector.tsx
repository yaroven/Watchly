"use client";

import { TitleType } from "@/features/title/schemas/title";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import MovieIcon from "@mui/icons-material/Movie";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { tokens } from "@shared/mui/theme";
import type { ReactNode } from "react";

interface TypeSelectorProps {
  value?: TitleType;
  onChange: (type: TitleType) => void;
  disabled?: boolean;
}

const OPTIONS: { value: TitleType; label: string; hint: string; icon: ReactNode }[] = [
  {
    value: TitleType.MOVIE,
    label: "Movie",
    hint: "One video file. Uploads and transcodes from this screen.",
    icon: <MovieIcon sx={{ fontSize: 22 }} />,
  },
  {
    value: TitleType.SERIES,
    label: "Series",
    hint: "Seasons and episodes are added after the title exists.",
    icon: <LiveTvIcon sx={{ fontSize: 22 }} />,
  },
];

export default function TypeSelector({ value, onChange, disabled = false }: TypeSelectorProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <Typography component="span" sx={{ fontSize: "14px", color: "text.secondary" }}>
        Type
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: "14px" }}>
        {OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <Box
              key={option.value}
              component="button"
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              sx={{
                textAlign: "left",
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
                minHeight: 44,
                p: "16px 18px",
                borderRadius: "12px",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled && !selected ? 0.5 : 1,
                font: "inherit",
                backgroundColor: selected ? alpha(tokens.accent.primary, 0.08) : tokens.surface.dropzone,
                border: `1px solid ${selected ? tokens.accent.primary : tokens.border.subtle}`,
                color: selected ? tokens.accent.primary : tokens.text.secondary,
                transition: "border-color .15s ease, background-color .15s ease",
                "&:hover:not(:disabled)": { borderColor: tokens.accent.primary },
              }}
            >
              {option.icon}
              <Box>
                <Typography sx={{ fontSize: "15px", fontWeight: 600, color: selected ? "#ffffff" : tokens.text.field }}>
                  {option.label}
                </Typography>
                <Typography sx={{ mt: "3px", fontSize: "12px", lineHeight: 1.45, color: "text.secondary" }}>{option.hint}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
