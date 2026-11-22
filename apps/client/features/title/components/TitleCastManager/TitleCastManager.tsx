"use client";

import type { Artist } from "@/features/artist";
import { useArtists } from "@/features/artist";
import useTitleCast from "@/features/title/api/use-title-cast";
import { useSetTitleCast } from "@/features/title/api/use-title-mutations";
import { CastCredit } from "@/features/title/schemas/title";
import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { languageName } from "@shared/lib/content-locale";
import { useEditingLanguage } from "@shared/lib/editing-language";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type CastRow, toCastCreditInputs, toCastRows, withCharacterTranslation } from "./cast-rows";

interface TitleCastManagerProps {
  titleId: string;
}

export default function TitleCastManager({ titleId }: TitleCastManagerProps) {
  const t = useTranslations("title.cast");
  const { data: cast, isPending } = useTitleCast(titleId);
  const [rows, setRows] = useState<CastRow[]>([]);
  const { language, isBase, translationLocale } = useEditingLanguage();
  const uiLocale = useLocale();
  const languageLabel = languageName(language, uiLocale);
  const [isDirty, setIsDirty] = useState(false);
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [syncedCast, setSyncedCast] = useState<CastCredit[] | undefined>(undefined);

  const [artistSearch, setArtistSearch] = useState("");
  const { data: artistResults, isFetching: isSearchingArtists } = useArtists(
    { searchString: artistSearch, limit: 10 },
    { enabled: artistSearch.length > 0 },
  );

  if (cast && cast !== syncedCast) {
    setSyncedCast(cast);
    setRows(toCastRows(cast));
    setIsDirty(false);
  }

  const describeError = useApiErrorMessage();
  const { mutate: saveCast, isPending: isSaving } = useSetTitleCast({
    onSuccess: () => {
      setMessage({ severity: "success", text: t("updated") });
      setIsDirty(false);
    },
    onError: (error) => setMessage({ severity: "error", text: `${t("updateFailed")} ${describeError(error)}` }),
  });

  const availableArtists = (artistResults?.items || []).filter((artist) => !rows.some((row) => row.artistId === artist.id));

  const addArtist = (artist: Artist) => {
    setRows((prev) => [
      ...prev,
      { artistId: artist.id, name: artist.name, photoUrl: artist.photoUrl, character: "", characterTranslations: {} },
    ]);
    setIsDirty(true);
    setArtistSearch("");
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const updateCharacter = (index: number, value: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i !== index ? row : isBase ? { ...row, character: value } : withCharacterTranslation(row, translationLocale!, value),
      ),
    );
    setIsDirty(true);
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    setMessage(null);
    saveCast({ id: titleId, credits: toCastCreditInputs(rows) });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {message && (
        <Alert severity={message.severity} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {!isPending && rows.length === 0 && <Typography sx={{ color: "text.secondary" }}>{t("empty")}</Typography>}

      <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {rows.map((row, index) => (
          <Box
            key={row.artistId}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              p: "10px 14px",
              borderRadius: "12px",
              border: "1px solid",
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.02)",
            }}
          >
            <Avatar src={row.photoUrl || undefined} sx={{ width: 40, height: 40 }}>
              {row.name.charAt(0)}
            </Avatar>

            <Box sx={{ minWidth: 0, flex: "0 0 180px" }}>
              <Typography noWrap sx={{ color: tokens.text.primary, fontWeight: 600 }}>
                {row.name}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
              {isBase ? (
                <TextField
                  size="small"
                  placeholder={t("characterPlaceholder")}
                  slotProps={{ htmlInput: { "aria-label": t("characterLabel", { name: row.name }) } }}
                  value={row.character}
                  onChange={(e) => updateCharacter(index, e.target.value)}
                />
              ) : (
                <TextField
                  size="small"
                  disabled={!row.character.trim()}
                  placeholder={
                    row.character.trim() ? t("characterTranslatedPlaceholder", { character: row.character }) : t("characterNeedsBase")
                  }
                  value={row.characterTranslations[translationLocale!] ?? ""}
                  onChange={(e) => updateCharacter(index, e.target.value)}
                  slotProps={{
                    htmlInput: { lang: language, "aria-label": t("characterTranslatedLabel", { name: row.name, language: languageLabel }) },
                  }}
                />
              )}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <IconButton size="small" disabled={index === 0} onClick={() => moveRow(index, -1)} aria-label={t("moveUp")}>
                <KeyboardArrowUpIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" disabled={index === rows.length - 1} onClick={() => moveRow(index, 1)} aria-label={t("moveDown")}>
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            </Box>

            <IconButton aria-label={t("remove")} color="error" onClick={() => removeRow(index)}>
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        ))}
      </Box>

      <Autocomplete
        options={availableArtists}
        loading={isSearchingArtists}
        getOptionLabel={(artist) => artist.name}
        filterOptions={(options) => options}
        inputValue={artistSearch}
        onInputChange={(_, value) => setArtistSearch(value)}
        onChange={(_, artist) => artist && addArtist(artist)}
        value={null}
        noOptionsText={artistSearch ? t("noActorsFound") : t("typeToSearch")}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder={t("addActorPlaceholder")}
            slotProps={{
              ...params.slotProps,
              htmlInput: { ...params.slotProps.htmlInput, "aria-label": t("addActorLabel") },
            }}
          />
        )}
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={handleSave} disabled={!isDirty || isSaving}>
          {isSaving ? t("saving") : t("save")}
        </Button>
      </Box>
    </Box>
  );
}
