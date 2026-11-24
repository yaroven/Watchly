"use client";

import TitleStatusBadge from "@/features/title/components/AdminTitle/components/TitleStatusBadge";
import { ExternalRatingSource, Title, TitleType } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import TranscodingStatus from "@/types/transcoding-status";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ReplayIcon from "@mui/icons-material/Replay";
import SyncIcon from "@mui/icons-material/Sync";
import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { languageName, TRANSLATION_LOCALES, type TranslationCoverage, type TranslationLocale } from "@shared/lib/content-locale";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import { CoverageDot } from "@shared/ui/LocalePicker";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";

interface TitleSidePanelProps {
  title: Title;
  transcodingStatus: TranscodingStatus;
  isTranscoding: boolean;
  isSyncingRatings: boolean;
  isDeleting: boolean;
  onPreview: () => void;
  onRestartTranscoding: () => void;
  onSyncRatings: () => void;
  coverage: Partial<Record<TranslationLocale, TranslationCoverage>>;
  isTranslationsPending: boolean;
  isTranslationsError: boolean;
  onOpenLocale: (locale: TranslationLocale) => void;
  onDelete: () => void;
}

const PERCENT_SOURCES = new Set([ExternalRatingSource.ROTTEN_TOMATOES, ExternalRatingSource.METACRITIC]);

export default function TitleSidePanel({
  title,
  transcodingStatus,
  isTranscoding,
  isSyncingRatings,
  isDeleting,
  onPreview,
  onRestartTranscoding,
  onSyncRatings,
  coverage,
  isTranslationsPending,
  isTranslationsError,
  onOpenLocale,
  onDelete,
}: TitleSidePanelProps) {
  const t = useTranslations("title.editor");
  const tDetails = useTranslations("title.details");
  const format = useFormatter();
  const isMovie = title.type === TitleType.MOVIE;

  return (
    <Box
      component="aside"
      sx={{
        position: { lg: "sticky" },
        top: { lg: "calc(var(--admin-header-h, 0px) + 72px)" },
        display: "flex",
        flexDirection: "column",
        borderTop: { xs: `1px solid ${tokens.border.subtle}`, lg: "none" },
        borderLeft: { lg: `1px solid ${tokens.border.subtle}` },
        "& > *:not(:last-child)": { borderBottom: `1px solid ${tokens.border.subtle}` },
      }}
    >
      <PanelBlock label={t("aside.video")}>
        {isMovie ? (
          <>
            <TitleStatusBadge status={transcodingStatus} />
            {transcodingStatus === TranscodingStatus.COMPLETED && (
              <PanelAction icon={<PlayArrowIcon />} onClick={onPreview}>
                {tDetails("preview")}
              </PanelAction>
            )}
            {transcodingStatus === TranscodingStatus.FAILED && (
              <PanelAction icon={<ReplayIcon />} onClick={onRestartTranscoding} disabled={isTranscoding}>
                {isTranscoding ? tDetails("restarting") : tDetails("restartTranscoding")}
              </PanelAction>
            )}
          </>
        ) : (
          <Typography variant="body2">{t("aside.videoPerEpisode")}</Typography>
        )}
      </PanelBlock>

      <PanelBlock label={t("aside.poster")}>
        {title.posterUrl ? (
          <Box
            sx={{
              position: "relative",
              width: 120,
              aspectRatio: "2 / 3",
              borderRadius: "8px",
              overflow: "hidden",
              border: `1px solid ${tokens.border.subtle}`,
            }}
          >
            <Image src={getOptimizedImageSrc(title.posterUrl)} alt={title.name} fill sizes="120px" style={{ objectFit: "cover" }} />
          </Box>
        ) : (
          <Typography variant="body2">{t("aside.posterMissing")}</Typography>
        )}
      </PanelBlock>

      <TranslationsBlock coverage={coverage} isPending={isTranslationsPending} isError={isTranslationsError} onOpenLocale={onOpenLocale} />

      <PanelBlock label={t("aside.ratings")}>
        {title.externalRatings.length ? (
          <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "1fr auto", rowGap: "6px", columnGap: "12px" }}>
            {title.externalRatings.map(({ source, rating }) => (
              <Box key={source} sx={{ display: "contents" }}>
                <Typography component="dt" variant="body2">
                  {t(`ratingSource.${source}`)}
                </Typography>
                <Typography
                  component="dd"
                  sx={{ m: 0, fontSize: "13px", fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "end" }}
                >
                  {PERCENT_SOURCES.has(source) ? `${Math.round(rating)}%` : `${rating.toFixed(1)}/10`}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2">{t("aside.ratingsEmpty")}</Typography>
        )}
        <PanelAction icon={<SyncIcon />} onClick={onSyncRatings} disabled={isSyncingRatings}>
          {isSyncingRatings ? tDetails("syncingRatings") : tDetails("syncRatings")}
        </PanelAction>
      </PanelBlock>

      <PanelBlock label={t("aside.record")}>
        <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", rowGap: "4px", columnGap: "12px" }}>
          {[
            [t("aside.created"), title.createdAt],
            [t("aside.updated"), title.updatedAt],
          ].map(([label, date]) => (
            <Box key={String(label)} sx={{ display: "contents" }}>
              <Typography component="dt" variant="body2">
                {String(label)}
              </Typography>
              <Typography component="dd" sx={{ m: 0, fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>
                {format.dateTime(new Date(date as Date), { day: "numeric", month: "short", year: "numeric" })}
              </Typography>
            </Box>
          ))}
        </Box>
      </PanelBlock>

      <Box sx={{ px: "24px", py: "16px" }}>
        <Button
          variant="outlined"
          danger
          onClick={onDelete}
          disabled={isDeleting}
          sx={{ color: tokens.feedback.error, borderColor: tokens.border.subtle }}
        >
          {tDetails("deleteTitle")}
        </Button>
      </Box>
    </Box>
  );
}

function TranslationsBlock({
  coverage,
  isPending,
  isError,
  onOpenLocale,
}: {
  coverage: Partial<Record<TranslationLocale, TranslationCoverage>>;
  isPending: boolean;
  isError: boolean;
  onOpenLocale: (locale: TranslationLocale) => void;
}) {
  const t = useTranslations("title.editor");
  const tLocale = useTranslations("contentLocale");
  const uiLocale = useLocale();
  const done = TRANSLATION_LOCALES.filter((locale) => coverage[locale] === "done").length;
  const locales = [...TRANSLATION_LOCALES].sort((a, b) => languageName(a, uiLocale).localeCompare(languageName(b, uiLocale), uiLocale));

  return (
    <PanelBlock label={t("aside.translations")}>
      {isPending ? (
        <Box sx={{ height: 20, width: "70%", borderRadius: "4px", backgroundColor: tokens.surface.fill }} />
      ) : isError ? (
        <Typography variant="body2">{t("aside.translationLoadError")}</Typography>
      ) : (
        <>
          <Typography sx={{ fontSize: "13px", color: tokens.text.field, fontVariantNumeric: "tabular-nums" }}>
            {t("aside.translationsSummary", { done, total: TRANSLATION_LOCALES.length })}
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", width: "100%", display: "flex", flexDirection: "column" }}>
            {locales.map((locale) => {
              const name = languageName(locale, uiLocale);
              const state = coverage[locale] ?? "none";
              return (
                <li key={locale}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onOpenLocale(locale)}
                    aria-label={`${t("aside.openLanguage", { language: name })}, ${tLocale(`coverage.${state}`)}`}
                    sx={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      mx: "-8px",
                      px: "8px",
                      py: "6px",
                      boxSizing: "content-box",
                      border: 0,
                      borderRadius: "6px",
                      background: "none",
                      cursor: "pointer",
                      font: "inherit",
                      color: tokens.text.primary,
                      textAlign: "start",
                      "&:hover": { backgroundColor: tokens.surface.fill },
                      "&:focus-visible": { outline: `2px solid ${tokens.accent.primary}`, outlineOffset: "-2px" },
                    }}
                  >
                    <CoverageDot coverage={state} />
                    <Box component="span" sx={{ flex: 1, minWidth: 0, fontSize: "13px" }}>
                      {name}
                    </Box>
                    <Box component="span" sx={{ fontSize: "12px", color: tokens.text.secondary }}>
                      {tLocale(`coverage.${state}`)}
                    </Box>
                  </Box>
                </li>
              );
            })}
          </Box>
        </>
      )}
    </PanelBlock>
  );
}

function PanelBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box
      component="section"
      aria-label={label}
      sx={{ px: "24px", py: "16px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px" }}
    >
      <Typography
        component="h2"
        sx={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: tokens.text.placeholder }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function PanelAction({
  icon,
  onClick,
  disabled,
  children,
}: {
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <MuiButton
      onClick={onClick}
      disabled={disabled}
      startIcon={icon}
      size="small"
      sx={{
        ml: "-8px",
        px: "8px",
        minHeight: 32,
        fontSize: "13px",
        fontWeight: 500,
        color: tokens.accent.primary,
        "& .MuiButton-startIcon > *": { fontSize: "16px" },
      }}
    >
      {children}
    </MuiButton>
  );
}
