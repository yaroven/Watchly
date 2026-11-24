"use client";

import useAllGenres from "@/features/genre/api/use-all-genres";
import { useCreateGenre, useDeleteGenre, useUpdateGenre } from "@/features/genre/api/use-genre-mutations";
import { Genre } from "@/features/genre/schemas/genre";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SellIcon from "@mui/icons-material/Sell";
import TranslateIcon from "@mui/icons-material/Translate";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { INLINE_ERROR } from "@shared/api/write-errors";
import { BASE_CONTENT_LOCALE, type ContentLocale } from "@shared/lib/content-locale";
import { inputVariants, tokens } from "@shared/mui/theme";
import ConfirmDialog from "@shared/ui/ConfirmDialog";
import GradientCard from "@shared/ui/GradientCard";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import GenreTranslationModal from "./components/GenreTranslationModal";

export default function GenresLibrary() {
  const t = useTranslations("genre");
  const { data, isPending } = useAllGenres();
  const genres = data?.items ?? [];
  const uiLocale = useLocale() as ContentLocale;
  const showsLocalName = uiLocale !== BASE_CONTENT_LOCALE;
  const { data: localData } = useAllGenres({ enabled: showsLocalName, contentLocale: uiLocale });
  const localNames = new Map(
    showsLocalName ? (localData?.items ?? []).filter((genre) => !genre.content.fallback).map((genre) => [genre.id, genre.name]) : [],
  );

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Genre | null>(null);
  const [translating, setTranslating] = useState<Genre | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const describeError = useApiErrorMessage();
  const duplicate = { 400: t("library.duplicate") };

  const { mutate: createGenre, isPending: isCreating } = useCreateGenre({
    onSuccess: () => setNewName(""),
    onError: (error) => setErrorMessage(describeError(error, duplicate)),
  });
  const { mutate: updateGenre, isPending: isUpdating } = useUpdateGenre({
    onSuccess: () => setEditingId(null),
    onError: (error) => setErrorMessage(describeError(error, duplicate)),
  });
  const {
    mutate: deleteGenre,
    isPending: isDeleting,
    error: deleteError,
    reset: resetDelete,
  } = useDeleteGenre({ meta: INLINE_ERROR, onSuccess: () => setPendingDelete(null) });

  const startEdit = (genre: Genre) => {
    setEditingId(genre.id);
    setEditingName(genre.name);
  };

  const submitEdit = () => {
    if (!editingId || !editingName.trim()) return;
    updateGenre({ id: editingId, data: { name: editingName.trim() } });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: "28px", p: { xs: "24px 16px 40px", md: "40px 36px 56px" } }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          width: "100%",
          gap: "24px",
          pb: "28px",
          borderBottom: "1px solid",
          borderColor: "divider",
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Box>
          <Typography component="h1" variant="h2" sx={{ color: tokens.text.primary }}>
            {t("library.title")}
          </Typography>
          <Typography sx={{ mt: "14px", maxWidth: "640px", color: "text.secondary" }}>{t("library.subtitle")}</Typography>
        </Box>
      </Box>

      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <GradientCard radius={24} sx={{ width: "100%", maxWidth: 520, p: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px", color: "text.secondary" }}>
          <SellIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {t("library.count", { count: genres.length })}
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) createGenre({ name: newName.trim() });
          }}
          sx={{ display: "flex", gap: "8px" }}
        >
          <Box
            component="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("library.newPlaceholder")}
            disabled={isCreating}
            sx={{ ...inputVariants.pill, flex: 1, height: 40, fontSize: "14px", border: "none", color: tokens.text.field }}
          />
          <IconButton
            type="submit"
            disabled={isCreating || !newName.trim()}
            aria-label={t("library.add")}
            sx={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              bgcolor: "primary.main",
              color: tokens.surface.paper,
              "&:hover": { bgcolor: "primary.main" },
            }}
          >
            <AddIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {isPending
            ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} variant="rounded" height={40} sx={{ borderRadius: "10px" }} />)
            : genres.map((genre) => {
                const isEditing = editingId === genre.id;
                const canDelete = !genre.titleCount;

                return (
                  <Box
                    key={genre.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      px: "12px",
                      py: "8px",
                      borderRadius: "10px",
                      border: "1px solid",
                      borderColor: "rgba(255,255,255,0.08)",
                      backgroundColor: "rgba(255,255,255,0.02)",
                    }}
                  >
                    {isEditing ? (
                      <>
                        <Box
                          component="input"
                          autoFocus
                          aria-label={t("library.renameField", { name: genre.name })}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          sx={{
                            flex: 1,
                            height: 28,
                            fontSize: "14px",
                            color: tokens.text.primary,
                            backgroundColor: "transparent",
                            border: `1px solid ${tokens.border.faint}`,
                            borderRadius: "6px",
                            px: "8px",
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={submitEdit}
                          disabled={isUpdating}
                          aria-label={t("library.save")}
                          sx={{ color: tokens.feedback.success }}
                        >
                          <CheckIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setEditingId(null)}
                          aria-label={t("library.cancel")}
                          sx={{ color: tokens.text.secondary }}
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: "14px", color: tokens.text.primary, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {genre.name}
                          </Typography>
                          {localNames.has(genre.id) && (
                            <Typography
                              lang={uiLocale}
                              sx={{ fontSize: "12px", color: tokens.text.secondary, overflow: "hidden", textOverflow: "ellipsis" }}
                            >
                              {localNames.get(genre.id)}
                            </Typography>
                          )}
                        </Box>
                        <Typography sx={{ fontSize: "12px", color: "text.secondary" }}>
                          {t("library.titleCount", { count: genre.titleCount ?? 0 })}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setTranslating(genre)}
                          aria-label={t("translation.open", { name: genre.name })}
                          sx={{ color: localNames.has(genre.id) ? tokens.accent.primary : tokens.text.field }}
                        >
                          <TranslateIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => startEdit(genre)}
                          aria-label={t("library.rename", { name: genre.name })}
                          sx={{ color: tokens.text.field }}
                        >
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <Tooltip title={canDelete ? "" : t("library.stillAssigned", { count: genre.titleCount ?? 0 })}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!canDelete}
                              onClick={() => {
                                resetDelete();
                                setPendingDelete(genre);
                              }}
                              aria-label={t("library.deleteLabel", { name: genre.name })}
                              sx={{ color: canDelete ? tokens.feedback.error : tokens.text.placeholder }}
                            >
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                );
              })}

          {!isPending && !genres.length && (
            <Typography sx={{ fontSize: "13px", color: "text.secondary", textAlign: "center", py: "12px" }}>
              {t("library.empty")}
            </Typography>
          )}
        </Box>
      </GradientCard>

      <GenreTranslationModal genre={translating} onClose={() => setTranslating(null)} />

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteGenre(pendingDelete.id)}
        isPending={isDeleting}
        error={describeError(deleteError, { 400: t("library.stillAssignedError") })}
        confirmLabel={t("delete.confirm")}
        pendingLabel={t("delete.pending")}
        title={t("delete.title")}
        description={t.rich("delete.description", {
          name: pendingDelete?.name ?? "",
          strong: (chunks) => <Typography component="strong">{chunks}</Typography>,
        })}
      />
    </Box>
  );
}
