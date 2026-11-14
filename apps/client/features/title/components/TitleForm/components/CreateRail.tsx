"use client";

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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("title");
  const posterFile = values.posterFile?.[0];
  const posterUrl = useMemo(() => (posterFile ? URL.createObjectURL(posterFile) : null), [posterFile]);

  useEffect(() => {
    return () => {
      if (posterUrl) URL.revokeObjectURL(posterUrl);
    };
  }, [posterUrl]);

  const missingFields = readiness.missingKeys.map((key) => t(`fields.${key}`)).join(", ");

  const releaseYear = values.releaseDate?.slice(0, 4);
  const chips = [
    values.type === TitleType.SERIES ? t("type.SERIES") : t("type.MOVIE"),
    releaseYear || null,
    values.runtime ? t("form.rail.runtime", { minutes: values.runtime }) : null,
  ].filter(Boolean) as string[];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", position: "sticky", top: "24px" }}>
      <Box sx={PANEL_SX}>
        <Typography sx={{ ...CAPTION_SX, mb: "16px" }}>{t("form.rail.catalogPreview")}</Typography>

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
              {t("form.rail.posterPreview")}
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
              {values.name?.trim() || t("form.rail.untitled")}
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
              {t(`ageRating.${values.ageRating}`)}
            </Typography>
          )}
        </Box>

        <Typography sx={{ mt: "12px", fontSize: "13px", lineHeight: 1.5, color: "text.secondary" }}>
          {genreNames.length ? genreNames.join(" · ") : t("form.rail.noGenresPicked")}
        </Typography>
      </Box>

      <Box sx={PANEL_SX}>
        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px" }}>
          <Typography sx={CAPTION_SX}>{t("form.rail.readyToSave")}</Typography>
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
                <Typography sx={{ flexGrow: 1, fontSize: "14px", color: tokens.text.field }}>
                  {t(`form.sections.${section.key}.title`)}
                </Typography>
                <Typography sx={{ fontSize: "13px", color: tokens.text.placeholder }}>
                  {done} / {section.items.length}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {readiness.missingKeys.length > 0 && (
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
            {t.rich("form.rail.missing", {
              fields: missingFields,
              value: (chunks) => (
                <Box component="span" sx={{ color: tokens.text.field }}>
                  {chunks}
                </Box>
              ),
            })}
          </Typography>
        )}
      </Box>

      <Box sx={PANEL_SX}>
        {isUploading ? (
          <Box>
            <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
              <Typography sx={{ fontSize: "14px", color: tokens.text.field }}>{t("form.rail.uploadingVideo")}</Typography>
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
                {t("form.rail.uploadPart", { completed: uploadParts.completed, total: uploadParts.total })}
              </Typography>
            )}
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px", mb: "14px" }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: tokens.feedback.warning }} />
              <Typography sx={{ fontSize: "13px", color: "text.secondary" }}>{t("form.rail.draft")}</Typography>
            </Box>
            <Button type="submit" disabled={isPending} sx={{ width: "100%" }}>
              {isPending ? t("form.saving") : t("form.create")}
            </Button>
          </>
        )}

        <Typography sx={{ mt: "14px", fontSize: "12px", lineHeight: 1.55, color: "text.secondary" }}>{t("form.rail.saveOrder")}</Typography>
      </Box>
    </Box>
  );
}
