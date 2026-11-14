"use client";

import { AgeRating } from "@/features/title/schemas/title";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import { useTranslations } from "next-intl";

interface AgeRatingPickerProps {
  value?: AgeRating;
  onChange: (rating: AgeRating) => void;
  error?: string;
}

const OPTIONS = Object.values(AgeRating);

export default function AgeRatingPicker({ value, onChange, error }: AgeRatingPickerProps) {
  const t = useTranslations("title");

  return (
    <Box id="field-ageRating" sx={{ display: "flex", flexDirection: "column", gap: "10px", scrollMarginTop: "24px" }}>
      <Typography component="span" sx={{ fontSize: "14px", color: "text.secondary" }}>
        {t("fields.ageRating")}
      </Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {OPTIONS.map((option) => {
          const selected = value === option;

          return (
            <Box
              key={option}
              component="button"
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              sx={{
                minHeight: 44,
                px: "20px",
                borderRadius: "24px",
                cursor: "pointer",
                fontSize: "14px",
                font: "inherit",
                fontWeight: selected ? 600 : 400,
                backgroundColor: selected ? tokens.accent.primary : tokens.surface.fill,
                border: `1px solid ${selected ? tokens.accent.primary : tokens.surface.fill}`,
                color: selected ? tokens.surface.default : tokens.text.field,
                transition: "background-color .15s ease, border-color .15s ease",
                "&:hover": { borderColor: tokens.accent.primary },
              }}
            >
              {t(`ageRating.${option}`)}
            </Box>
          );
        })}
      </Box>

      {error && (
        <Typography role="alert" sx={{ fontSize: "12px", color: tokens.feedback.error }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
