"use client";

import { genreTranslations } from "@/features/genre/api/genre.translations";
import { Genre } from "@/features/genre/schemas/genre";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useContentTranslations } from "@shared/api/content-translations";
import { coverageByLocale, TRANSLATION_LOCALES, type TranslationLocale } from "@shared/lib/content-locale";
import { tokens } from "@shared/mui/theme";
import LocalePicker from "@shared/ui/LocalePicker";
import Modal from "@shared/ui/Modal";
import ContentTranslationEditor from "@shared/ui/TranslationEditor/ContentTranslationEditor";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface GenreTranslationModalProps {
  genre: Genre | null;
  onClose: () => void;
}

export default function GenreTranslationModal({ genre, onClose }: GenreTranslationModalProps) {
  return (
    <Modal isOpen={!!genre} onClose={onClose} size="sm">
      {genre && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <GenreTranslationPanel key={genre.id} genre={genre} />
        </Box>
      )}
    </Modal>
  );
}

function GenreTranslationPanel({ genre }: { genre: Genre }) {
  const t = useTranslations("genre.translation");
  const [locale, setLocale] = useState<TranslationLocale>(TRANSLATION_LOCALES[0]);
  const { data: translations } = useContentTranslations(genreTranslations, genre.id);

  return (
    <>
      <Box sx={{ pr: "44px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <Box>
          <Typography component="h2" sx={{ fontSize: "22px", fontWeight: 700, color: tokens.text.primary }}>
            {t("heading")}
          </Typography>
          <Typography sx={{ mt: "6px", fontSize: "14px", color: tokens.text.secondary }}>{t("english", { name: genre.name })}</Typography>
        </Box>
        <LocalePicker
          value={locale}
          onChange={(next) => setLocale(next as TranslationLocale)}
          includeBase={false}
          coverage={coverageByLocale(
            translations,
            genreTranslations.fields.map((field) => field.name),
          )}
        />
      </Box>
      <ContentTranslationEditor key={locale} content={genreTranslations} id={genre.id} locale={locale} />
    </>
  );
}
