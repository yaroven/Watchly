"use client";

import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TranslateIcon from "@mui/icons-material/Translate";
import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import InputBase from "@mui/material/InputBase";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import {
  BASE_CONTENT_LOCALE,
  type ContentLocale,
  languageName,
  TRANSLATION_LOCALES,
  type TranslationCoverage,
  type TranslationLocale,
} from "@shared/lib/content-locale";
import { useEditingLanguage } from "@shared/lib/editing-language";
import { tokens } from "@shared/mui/theme";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";

const SEARCH_FROM = 7;

interface LocalePickerProps {
  value: ContentLocale;
  onChange: (locale: ContentLocale) => void;
  locales?: readonly TranslationLocale[];
  coverage: Partial<Record<TranslationLocale, TranslationCoverage>>;
  includeBase?: boolean;
  label?: string;
}

export const COVERAGE_COLOR: Record<TranslationCoverage, string> = {
  done: tokens.feedback.success,
  partial: tokens.feedback.warning,
  none: tokens.border.faint,
};

export function CoverageDot({ coverage }: { coverage: TranslationCoverage | undefined }) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        flex: "none",
        width: 7,
        height: 7,
        borderRadius: "50%",
        boxSizing: "border-box",
        backgroundColor: coverage && coverage !== "none" ? COVERAGE_COLOR[coverage] : "transparent",
        border: coverage === "none" ? `1.5px solid ${COVERAGE_COLOR.none}` : "none",
      }}
    />
  );
}

export default function LocalePicker({
  value,
  onChange,
  locales = TRANSLATION_LOCALES,
  coverage,
  includeBase = true,
  label,
}: LocalePickerProps) {
  const t = useTranslations("contentLocale");
  const uiLocale = useLocale();
  const buttonId = useId();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");

  const named = useMemo(
    () => locales.map((code) => ({ code, name: languageName(code, uiLocale) })).sort((a, b) => a.name.localeCompare(b.name, uiLocale)),
    [locales, uiLocale],
  );
  const needle = query.trim().toLocaleLowerCase(uiLocale);
  const visible = needle
    ? named.filter(({ code, name }) => code.includes(needle) || name.toLocaleLowerCase(uiLocale).includes(needle))
    : named;
  const showSearch = locales.length >= SEARCH_FROM;

  const close = () => {
    setAnchor(null);
    setQuery("");
  };
  const pick = (locale: ContentLocale) => {
    onChange(locale);
    close();
  };

  const isBase = value === BASE_CONTENT_LOCALE;
  const current = languageName(value, uiLocale);

  return (
    <>
      <MuiButton
        id={buttonId}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? "true" : undefined}
        aria-label={`${label ?? t("language")}: ${current}`}
        onClick={(event) => setAnchor(event.currentTarget)}
        startIcon={<TranslateIcon sx={{ fontSize: "16px !important" }} />}
        endIcon={<ExpandMoreIcon sx={{ fontSize: "18px !important" }} />}
        sx={{
          minHeight: 36,
          px: "12px",
          gap: "2px",
          fontSize: "14px",
          fontWeight: 500,
          color: tokens.text.primary,
          border: `1px solid ${tokens.border.subtle}`,
          borderRadius: "8px",
          "&:hover": { borderColor: tokens.border.faint, backgroundColor: "transparent" },
        }}
      >
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          {current}
          {isBase ? (
            <Typography component="span" sx={{ fontSize: "12px", color: tokens.text.placeholder }}>
              {t("baseLanguage")}
            </Typography>
          ) : (
            <CoverageDot coverage={coverage[value as TranslationLocale]} />
          )}
        </Box>
      </MuiButton>

      <Menu
        id={menuId}
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        autoFocus={!showSearch}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          list: { "aria-labelledby": buttonId, dense: true, sx: { py: "6px" } },
          paper: {
            sx: {
              mt: "6px",
              width: 300,
              maxHeight: 420,
              backgroundColor: tokens.surface.default,
              backgroundImage: "none",
              border: `1px solid ${tokens.border.subtle}`,
              borderRadius: "10px",
            },
          },
        }}
      >
        {showSearch && (
          <Box sx={{ px: "10px", pb: "6px" }} onKeyDown={(event) => event.stopPropagation()}>
            <InputBase
              autoFocus
              fullWidth
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("findLanguage")}
              inputProps={{ "aria-label": t("findLanguage") }}
              sx={{
                px: "10px",
                py: "4px",
                fontSize: "14px",
                borderRadius: "6px",
                border: `1px solid ${tokens.border.subtle}`,
                color: tokens.text.field,
              }}
            />
          </Box>
        )}

        {includeBase && [
          <LocaleItem
            key="base"
            name={languageName(BASE_CONTENT_LOCALE, uiLocale)}
            hint={t("baseLanguage")}
            selected={isBase}
            onClick={() => pick(BASE_CONTENT_LOCALE)}
          />,
          <Divider key="divider" sx={{ my: "6px !important", borderColor: tokens.border.subtle }} />,
          <ListSubheader
            key="heading"
            disableSticky
            sx={{ lineHeight: "28px", fontSize: "12px", fontWeight: 600, color: tokens.text.placeholder, backgroundColor: "transparent" }}
          >
            {t("translations")}
          </ListSubheader>,
        ]}

        {visible.map(({ code, name }) => (
          <LocaleItem
            key={code}
            name={name}
            code={code}
            hint={coverage[code] ? t(`coverage.${coverage[code]}`) : ""}
            coverage={coverage[code]}
            selected={value === code}
            onClick={() => pick(code)}
          />
        ))}

        {visible.length === 0 && (
          <Typography sx={{ px: "16px", py: "8px", fontSize: "13px", color: tokens.text.secondary }}>
            {t("noLanguageFound", { query: query.trim() })}
          </Typography>
        )}
      </Menu>
    </>
  );
}

function LocaleItem({
  name,
  code,
  hint,
  coverage,
  selected,
  onClick,
}: {
  name: string;
  code?: string;
  hint: string;
  coverage?: TranslationCoverage | undefined;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <MenuItem
      selected={selected}
      onClick={onClick}
      sx={{
        mx: "6px",
        borderRadius: "6px",
        gap: "10px",
        minHeight: 36,
        "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: tokens.surface.fill },
      }}
    >
      {coverage ? <CoverageDot coverage={coverage} /> : <Box component="span" sx={{ width: 7, flex: "none" }} />}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: "8px" }}>
        <Typography component="span" sx={{ fontSize: "14px", color: tokens.text.primary }}>
          {name}
        </Typography>
        {code && (
          <Typography
            component="span"
            sx={{ fontSize: "11px", letterSpacing: "0.04em", color: tokens.text.placeholder, textTransform: "uppercase" }}
          >
            {code}
          </Typography>
        )}
      </Box>
      <Typography component="span" sx={{ fontSize: "12px", color: tokens.text.secondary, whiteSpace: "nowrap" }}>
        {hint}
      </Typography>
      <CheckIcon sx={{ fontSize: 16, color: tokens.accent.primary, visibility: selected ? "visible" : "hidden" }} />
    </MenuItem>
  );
}

export function MissingTranslation() {
  const t = useTranslations("contentLocale");
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "12px",
        color: tokens.text.secondary,
        whiteSpace: "nowrap",
      }}
    >
      <CoverageDot coverage="none" />
      {t("missing")}
    </Box>
  );
}

export function EditingLanguageNote({ isNew }: { isNew: boolean }) {
  const t = useTranslations("contentLocale");
  const uiLocale = useLocale();
  const { language, isBase } = useEditingLanguage();
  if (isBase) return null;
  return (
    <Typography sx={{ fontSize: "13px", color: tokens.text.secondary }}>
      {isNew
        ? t("newInBase", { language: languageName(BASE_CONTENT_LOCALE, uiLocale) })
        : `${t("editingIn", { language: languageName(language, uiLocale) })}. ${t("changeInBar")}`}
    </Typography>
  );
}
