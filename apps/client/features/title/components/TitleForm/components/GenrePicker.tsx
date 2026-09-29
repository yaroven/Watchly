"use client";

import useGenres from "@/features/genre/api/use-genres";
import { ADMIN } from "@/shared/lib/routes";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { tokens } from "@shared/mui/theme";
import Link from "next/link";

interface GenrePickerProps {
  value: string[];
  onChange: (genreIds: string[]) => void;
}

export default function GenrePicker({ value, onChange }: GenrePickerProps) {
  const { data, isPending } = useGenres({ limit: 100 });
  const genres = data?.items ?? [];

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((genreId) => genreId !== id) : [...value, id]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
        <Typography component="span" sx={{ fontSize: "14px", color: "text.secondary" }}>
          Genres
        </Typography>
        <Typography component={Link} href={ADMIN.GENRES} sx={{ fontSize: "12px", color: "primary.main" }}>
          Manage genres
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {isPending ? (
          Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} variant="rounded" width={96} height={44} sx={{ borderRadius: "24px" }} />
          ))
        ) : genres.length ? (
          genres.map((genre) => {
            const selected = value.includes(genre.id);

            return (
              <Box
                key={genre.id}
                component="button"
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(genre.id)}
                sx={{
                  minHeight: 44,
                  px: "16px",
                  borderRadius: "24px",
                  cursor: "pointer",
                  fontSize: "13px",
                  font: "inherit",
                  fontWeight: selected ? 600 : 400,
                  backgroundColor: selected ? alpha(tokens.accent.primary, 0.14) : tokens.surface.dropzone,
                  border: selected ? `1px solid ${tokens.accent.primary}` : `1px dashed ${tokens.border.faint}`,
                  color: selected ? tokens.accent.primary : tokens.text.secondary,
                  transition: "border-color .15s ease, background-color .15s ease",
                  "&:hover": { borderColor: tokens.accent.primary },
                }}
              >
                {genre.name}
              </Box>
            );
          })
        ) : (
          <Typography sx={{ fontSize: "13px", color: "text.secondary" }}>No genres yet — add them on the Genres screen first.</Typography>
        )}
      </Box>
    </Box>
  );
}
