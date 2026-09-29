"use client";

import { useDeleteArtist } from "@/features/artist/api/use-artist-mutations";
import { useArtists } from "@/features/artist/api/use-artists";
import ArtistCard from "@/features/artist/components/ArtistCard";
import ArtistModal from "@/features/artist/components/ArtistModal";
import { Artist } from "@/features/artist/schemas/artist";
import { ADMIN } from "@/shared/lib/routes";
import Pagination from "@/shared/ui/Pagination";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { inputVariants, tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import ConfirmDialog from "@shared/ui/ConfirmDialog";
import GradientCard from "@shared/ui/GradientCard";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LIMIT = 18;

export default function ArtistsLibrary() {
  const router = useRouter();
  const [searchString, setSearchString] = useState("");
  const [page, setPage] = useState(1);
  const [modalArtist, setModalArtist] = useState<Artist | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Artist | null>(null);

  const { data, isPending, isFetching } = useArtists({ page, limit: LIMIT, searchString });
  const { mutate: deleteArtist, isPending: isDeleting } = useDeleteArtist({ onSuccess: () => setPendingDelete(null) });

  const artists = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / LIMIT);

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
            Actors
          </Typography>
          <Typography sx={{ mt: "14px", maxWidth: "640px", color: "text.secondary" }}>
            Manage the cast catalog actors are drawn from.
          </Typography>
        </Box>

        <Button variant="contained" onClick={() => setModalArtist("new")} startIcon={<AddIcon sx={{ fontSize: 22 }} />}>
          Add Actor
        </Button>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <TextField
          variant="standard"
          placeholder="Search actors..."
          value={searchString}
          onChange={(e) => {
            setSearchString(e.target.value);
            setPage(1);
          }}
          fullWidth
          slotProps={{
            input: {
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 22, color: tokens.text.placeholder }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ "& .MuiInputBase-root": { ...inputVariants.pill, height: 48, fontSize: "16px" } }}
        />

        <GradientCard radius={24} sx={{ width: "100%", p: "28px" }}>
          {isPending || isFetching ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {Array.from({ length: 12 }, (_, i) => (
                <Skeleton key={i} variant="rounded" width={160} height={213} sx={{ borderRadius: "16px" }} />
              ))}
            </Box>
          ) : artists.length ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {artists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  onOpen={() => router.push(ADMIN.ARTISTS_DETAIL(artist.id))}
                  onEdit={() => setModalArtist(artist)}
                  onDelete={() => setPendingDelete(artist)}
                />
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: "56px" }}>
              <Typography variant="h4" sx={{ color: "#ffffff", mb: "10px" }}>
                No actors found
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>Try a different search or add a new actor.</Typography>
            </Box>
          )}
        </GradientCard>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(Number(p))} />
        </Box>
      </Box>

      <ArtistModal
        isOpen={!!modalArtist}
        onClose={() => setModalArtist(null)}
        artist={modalArtist === "new" ? undefined : (modalArtist ?? undefined)}
      />

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteArtist(pendingDelete.id)}
        isPending={isDeleting}
        confirmLabel="Confirm Delete"
        pendingLabel="Deleting..."
        title="Delete Actor"
        description={
          <>
            Are you sure you want to delete <Typography component="strong">{pendingDelete?.name}</Typography>? This will also remove their
            cast credits. This action cannot be undone.
          </>
        }
      />
    </Box>
  );
}
