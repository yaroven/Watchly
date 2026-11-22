"use client";

import { Link } from "@/i18n/navigation";
import { ADMIN, APP } from "@/shared/lib/routes";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { type ContentLocale, languageName, type TranslationCoverage, type TranslationLocale } from "@shared/lib/content-locale";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import LocalePicker from "@shared/ui/LocalePicker";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { TitleEditStatus } from "../../TitleForm/TitleForm";

interface TitleEditorBarProps {
  titleId: string;
  titleName: string;
  language: ContentLocale;
  onLanguageChange: (language: ContentLocale) => void;
  saveMode: "form" | "hint" | "none";
  coverage: Partial<Record<TranslationLocale, TranslationCoverage>>;
  formId: string;
  status: TitleEditStatus;
}

export default function TitleEditorBar({
  titleId,
  titleName,
  language,
  onLanguageChange,
  saveMode,
  coverage,
  formId,
  status,
}: TitleEditorBarProps) {
  const t = useTranslations("title.editor");
  const tLocale = useTranslations("contentLocale");
  const format = useFormatter();
  const uiLocale = useLocale();

  const statusText = status.isPending
    ? t("saving")
    : status.isDirty
      ? t("unsaved")
      : status.savedAt
        ? t("saved", { time: format.dateTime(status.savedAt, { hour: "2-digit", minute: "2-digit" }) })
        : null;

  return (
    <Box
      sx={{
        position: "sticky",
        top: "var(--admin-header-h, 0px)",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px 20px",
        px: { xs: "16px", md: "32px" },
        py: "10px",
        backgroundColor: tokens.surface.default,
        borderBottom: `1px solid ${tokens.border.subtle}`,
      }}
    >
      <Box
        component="nav"
        aria-label={t("breadcrumb")}
        sx={{ minWidth: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}
      >
        <Box
          component={Link}
          href={ADMIN.TITLES}
          sx={{ color: tokens.text.secondary, textDecoration: "none", "&:hover": { color: tokens.text.primary } }}
        >
          {t("breadcrumb")}
        </Box>
        <Box component="span" aria-hidden sx={{ color: tokens.border.faint }}>
          /
        </Box>
        <Typography
          component="span"
          aria-current="page"
          sx={{
            fontSize: "14px",
            fontWeight: 500,
            color: tokens.text.primary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {titleName}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        {saveMode === "form" && statusText && (
          <Typography
            role="status"
            sx={{ fontSize: "13px", color: status.isDirty ? tokens.feedback.warning : tokens.text.secondary, whiteSpace: "nowrap" }}
          >
            {statusText}
          </Typography>
        )}

        <LocalePicker value={language} onChange={onLanguageChange} coverage={coverage} />

        <Button
          variant="outlined"
          href={`/${language}${APP.TITLE(titleId)}`}
          target="_blank"
          rel="noopener"
          endIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
        >
          {t("openOnSite")}
        </Button>

        {saveMode === "form" && (
          <Button type="submit" form={formId} disabled={status.isPending || !status.isDirty}>
            {status.isPending ? t("saving") : t("save")}
          </Button>
        )}
        {saveMode === "hint" && (
          <Typography sx={{ fontSize: "13px", color: tokens.text.secondary, maxWidth: "26ch" }}>
            {tLocale("saveHint", { language: languageName(language, uiLocale) })}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
