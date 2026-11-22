"use client";

import { TitleFormValues } from "@/features/title/schemas/title";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { tokens } from "@shared/mui/theme";
import { useTranslations } from "next-intl";
import type { FieldErrors } from "react-hook-form";

interface ValidationSummaryProps {
  errors: FieldErrors<TitleFormValues>;
}

const LABELLED_FIELDS: ReadonlySet<keyof TitleFormValues> = new Set<keyof TitleFormValues>([
  "name",
  "description",
  "director",
  "network",
  "type",
  "ageRating",
  "country",
  "language",
  "releaseDate",
  "runtime",
  "trailerUrl",
  "posterFile",
  "videoFile",
]);

const FIELD_ANCHORS: Partial<Record<keyof TitleFormValues, string>> = {
  ageRating: "field-ageRating",
  posterFile: "section-media",
  videoFile: "section-media",
};

export default function ValidationSummary({ errors }: ValidationSummaryProps) {
  const t = useTranslations("title");
  const failed = (Object.keys(errors) as (keyof TitleFormValues)[]).filter((key) => LABELLED_FIELDS.has(key));

  if (!failed.length) return null;

  return (
    <Box
      role="alert"
      sx={{
        display: "flex",
        gap: "14px",
        alignItems: "flex-start",
        p: "16px 18px",
        borderRadius: "12px",
        backgroundColor: alpha(tokens.feedback.error, 0.08),
        border: `1px solid ${tokens.feedback.error}`,
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 20, color: tokens.feedback.error, flexShrink: 0, mt: "1px" }} />

      <Box sx={{ flexGrow: 1 }}>
        <Typography sx={{ fontSize: "14px", fontWeight: 600, color: tokens.text.primary }}>
          {t("form.validationSummary", { count: failed.length })}
        </Typography>

        <Box sx={{ mt: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {failed.map((key) => (
            <Typography
              key={key}
              component="a"
              href={`#${FIELD_ANCHORS[key] ?? key}`}
              sx={{
                px: "12px",
                py: "5px",
                borderRadius: "999px",
                fontSize: "12px",
                textDecoration: "none",
                backgroundColor: alpha(tokens.feedback.error, 0.14),
                border: `1px solid ${alpha(tokens.feedback.error, 0.5)}`,
                color: tokens.text.field,
                "&:hover": { borderColor: tokens.feedback.error },
              }}
            >
              {t(`fields.${key}`)}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
