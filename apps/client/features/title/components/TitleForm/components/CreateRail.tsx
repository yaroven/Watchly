"use client";

import { AGE_RATING_LABELS } from "@/features/title/components/TitleForm/components/AgeRatingPicker";
import type { TitleReadiness } from "@/features/title/components/TitleForm/model/titleReadiness";
import { TitleFormValues, TitleType } from "@/features/title/schemas/title";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import InvertedCornerBox from "@shared/ui/InvertedCornerBox";
import { useEffect, useMemo } from "react";

interface CreateRailProps {
  values: Partial<TitleFormValues>;
  readiness: TitleReadiness;
  genreNames: string[];
  isPending: boolean;
  isUploading: boolean;
  uploadProgress: number;
  uploadParts: { completed: number; total: number } | null;
}

const PANEL_SX = {
  backgroundColor: tokens.surface.paper,
  border: `1px solid ${tokens.border.subtle}`,
  borderRadius: "12px",
  p: "22px",
} as const;

const CAPTION_SX = { fontSize: "12px", fontWeight: 700, letterSpacing: "0.10em", color: tokens.text.placeholder } as const;

export default function CreateRail({
  values,
  readiness,
  genreNames,
  isPending,
  isUploading,
  uploadProgress,
  uploadParts,
}: CreateRailProps) {
  const posterFile = values.posterFile?.[0];
  const posterUrl = useMemo(() => (posterFile ? URL.createObjectURL(posterFile) : null), [posterFile]);

  useEffect(() => {
    return () => {
      if (posterUrl) URL.revokeObjectURL(posterUrl);
    };
  }, [posterUrl]);

  const releaseYear = values.releaseDate?.slice(0, 4);
  const chips = [
    values.type === TitleType.SERIES ? "Series" : "Movie",
    releaseYear || null,
    values.runtime ? `${values.runtime} min` : null,
  ].filter(Boolean) as string[];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", position: "sticky", top: "24px" }}>
      <Box sx={PANEL_SX}>
        <Typography sx={{ ...CAPTION_SX, mb: "16px" }}>CATALOG PREVIEW</Typography>

        <InvertedCornerBox
          sx={{
            width: "100%",
            aspectRatio: "2 / 3",
            borderRadius: 26,
            border: `1px solid ${tokens.border.subtle}`,
            backgroundColor: tokens.surface.fill,
            backgroundImage: posterUrl ? `url(${posterUrl})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          {!posterUrl && (
            <Typography
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                letterSpacing: "0.12em",
                color: tokens.text.placeholder,
              }}
            >
              POSTER PREVIEW
            </Typography>
          )}

          <Box
            sx={{
              position: "relative",
              width: "100%",
              p: "22px 24px 26px",
              background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.88) 62%)",
            }}
          >
            <Typography
              sx={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                lineHeight: 1.05,
                textTransform: "uppercase",
                color: "#ffffff",
                wordBreak: "break-word",
              }}
            >
              {values.name?.trim() || "Untitled"}
            </Typography>
          </Box>
        </InvertedCornerBox>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px", mt: "18px" }}>
          {chips.map((chip) => (
            <Typography
              key={chip}
              sx={{
                px: "12px",
                py: "5px",
                borderRadius: "999px",
                backgroundColor: tokens.surface.fill,
                fontSize: "12px",
                color: tokens.text.field,
              }}
            >
              {chip}
            </Typography>
          ))}
          {values.ageRating && (
            <Typography
              sx={{
                px: "12px",
                py: "5px",
                borderRadius: "999px",
                border: `1px solid ${tokens.accent.primary}`,
                fontSize: "12px",
                color: "primary.main",
              }}
            >
              {AGE_RATING_LABELS[values.ageRating]}
            </Typography>
          )}
        </Box>

        <Typography sx={{ mt: "12px", fontSize: "13px", lineHeight: 1.5, color: "text.secondary" }}>
          {genreNames.length ? genreNames.join(" · ") : "No genres picked yet"}
        </Typography>
      </Box>

      <Box sx={PANEL_SX}>
        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px" }}>
          <Typography sx={CAPTION_SX}>READY TO SAVE</Typography>
          <Typography sx={{ fontFamily: "var(--font-display)", fontSize: "34px", lineHeight: 0.9, color: "#ffffff" }}>
            {readiness.doneCount}
            <Typography component="span" sx={{ fontSize: "18px", color: tokens.text.placeholder }}>
              /{readiness.totalCount}
            </Typography>
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={readiness.totalCount ? (readiness.doneCount / readiness.totalCount) * 100 : 0}
          sx={{
            mt: "14px",
            height: 6,
            borderRadius: "999px",
            backgroundColor: tokens.surface.fill,
            "& .MuiLinearProgress-bar": { borderRadius: "999px" },
          }}
        />

        <Box sx={{ mt: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {readiness.sections.map((section) => {
            const done = section.items.filter((item) => item.done).length;
            const complete = done === section.items.length;

            return (
              <Box key={section.key} sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {complete ? (
                  <CheckCircleIcon sx={{ fontSize: 16, color: tokens.feedback.success }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: tokens.feedback.warning }} />
                )}
                <Typography sx={{ flexGrow: 1, fontSize: "14px", color: tokens.text.field }}>{section.label}</Typography>
                <Typography sx={{ fontSize: "13px", color: tokens.text.placeholder }}>
                  {done} / {section.items.length}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {readiness.missingLabels.length > 0 && (
          <Typography
            sx={{
              mt: "18px",
              pt: "16px",
              borderTop: `1px dashed ${tokens.border.subtle}`,
              fontSize: "13px",
              lineHeight: 1.5,
              color: "text.secondary",
            }}
          >
            Missing:{" "}
            <Box component="span" sx={{ color: tokens.text.field }}>
              {readiness.missingLabels.join(", ")}
            </Box>
          </Typography>
        )}
      </Box>

      <Box sx={PANEL_SX}>
        {isUploading ? (
          <Box>
            <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
              <Typography sx={{ fontSize: "14px", color: tokens.text.field }}>Uploading video</Typography>
              <Typography sx={{ fontFamily: "var(--font-display)", fontSize: "26px", lineHeight: 1, color: "primary.main" }}>
                {uploadProgress}%
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{
                mt: "12px",
                height: 8,
                borderRadius: "999px",
                backgroundColor: tokens.surface.fill,
                "& .MuiLinearProgress-bar": { borderRadius: "999px" },
              }}
            />

            {uploadParts && uploadParts.total > 0 && (
              <Typography sx={{ mt: "10px", fontSize: "12px", color: "text.secondary" }}>
                part {uploadParts.completed} of {uploadParts.total}
              </Typography>
            )}
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px", mb: "14px" }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: tokens.feedback.warning }} />
              <Typography sx={{ fontSize: "13px", color: "text.secondary" }}>Draft — not saved yet</Typography>
            </Box>
            <Button type="submit" disabled={isPending} sx={{ width: "100%" }}>
              {isPending ? "Saving Title..." : "Create Title"}
            </Button>
          </>
        )}

        <Typography sx={{ mt: "14px", fontSize: "12px", lineHeight: 1.55, color: "text.secondary" }}>
          The record saves first, then the video uploads. If the upload fails the record is rolled back, so nothing half-made is left
          behind.
        </Typography>
      </Box>
    </Box>
  );
}
