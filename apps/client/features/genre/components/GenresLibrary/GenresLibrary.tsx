"use client";

import { useCreateGenre, useDeleteGenre, useUpdateGenre } from "@/features/genre/api/use-genre-mutations";
import useGenres from "@/features/genre/api/use-genres";
import { Genre } from "@/features/genre/schemas/genre";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SellIcon from "@mui/icons-material/Sell";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { inputVariants, tokens } from "@shared/mui/theme";
import ConfirmDialog from "@shared/ui/ConfirmDialog";
import GradientCard from "@shared/ui/GradientCard";
import { useState } from "react";

export default function GenresLibrary() {
  const { data, isPending } = useGenres({ limit: 100 });
  const genres = data?.items ?? [];

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Genre | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: createGenre, isPending: isCreating } = useCreateGenre({
    onSuccess: () => setNewName(""),
    onError: (error) => setErrorMessage(error.message),
  });
  const { mutate: updateGenre, isPending: isUpdating } = useUpdateGenre({
    onSuccess: () => setEditingId(null),
    onError: (error) => setErrorMessage(error.message),
  });
  const { mutate: deleteGenre, isPending: isDeleting } = useDeleteGenre({
    onSuccess: () => setPendingDelete(null),
    onError: (error) => setErrorMessage(error.message),
  });

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
          <Typography component="h1" variant="h2" sx={{ color: "#ffffff" }}>
            Genres
          </Typography>
          <Typography sx={{ mt: "14px", maxWidth: "640px", color: "text.secondary" }}>
            Manage the genre taxonomy titles are organized by.
          </Typography>
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
            {genres.length} Genre{genres.length === 1 ? "" : "s"}
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
            placeholder="New genre name"
            disabled={isCreating}
            sx={{ ...inputVariants.pill, flex: 1, height: 40, fontSize: "14px", border: "none", color: tokens.text.field }}
          />
          <IconButton
            type="submit"
            disabled={isCreating || !newName.trim()}
            aria-label="Add genre"
            sx={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              bgcolor: "primary.main",
              color: "#000000",
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
                            color: "#ffffff",
                            backgroundColor: "transparent",
                            border: `1px solid ${tokens.border.faint}`,
                            borderRadius: "6px",
                            px: "8px",
                          }}
                        />
                        <IconButton size="small" onClick={submitEdit} disabled={isUpdating} aria-label="Save" sx={{ color: "#27c237" }}>
                          <CheckIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => setEditingId(null)} aria-label="Cancel" sx={{ color: "#999999" }}>
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <Typography sx={{ flex: 1, fontSize: "14px", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {genre.name}
                        </Typography>
                        <Typography sx={{ fontSize: "12px", color: "text.secondary" }}>{genre.titleCount ?? 0} titles</Typography>
                        <IconButton
                          size="small"
                          onClick={() => startEdit(genre)}
                          aria-label={`Rename ${genre.name}`}
                          sx={{ color: "#e5e5e5" }}
                        >
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <Tooltip
                          title={canDelete ? "" : `Still assigned to ${genre.titleCount} title(s) — remove it from every title first`}
                        >
                          <span>
                            <IconButton
                              size="small"
                              disabled={!canDelete}
                              onClick={() => setPendingDelete(genre)}
                              aria-label={`Delete ${genre.name}`}
                              sx={{ color: canDelete ? "#f64e34" : "#555555" }}
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
            <Typography sx={{ fontSize: "13px", color: "text.secondary", textAlign: "center", py: "12px" }}>No genres yet.</Typography>
          )}
        </Box>
      </GradientCard>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteGenre(pendingDelete.id)}
        isPending={isDeleting}
        confirmLabel="Confirm Delete"
        pendingLabel="Deleting..."
        title="Delete Genre"
        description={
          <>
            Are you sure you want to delete <Typography component="strong">{pendingDelete?.name}</Typography>? This action cannot be undone.
          </>
        }
      />
    </Box>
  );
}
