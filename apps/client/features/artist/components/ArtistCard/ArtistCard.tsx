"use client";

import { Artist } from "@/features/artist/schemas/artist";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InvertedCornerBox from "@shared/ui/InvertedCornerBox";
import Image from "next/image";

interface ArtistCardProps {
  artist: Artist;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ArtistCard({ artist, onOpen, onEdit, onDelete }: ArtistCardProps) {
  const photoSrc = getOptimizedImageSrc(artist.photoUrl ?? undefined);

  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      aria-label={artist.name}
      sx={{
        width: "clamp(140px, 13vw, 220px)",
        cursor: "pointer",
        display: "block",
        textAlign: "left",
        font: "inherit",
        background: "none",
        border: "none",
        padding: 0,
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
        "&:hover .artist-card-actions, &:focus-within .artist-card-actions": { opacity: 1 },
      }}
    >
      <InvertedCornerBox
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "16px",
          border: "1px solid #333333",
          aspectRatio: "3 / 4",
        }}
      >
        <Image src={photoSrc} alt="" fill sizes="(max-width: 900px) 140px, 13vw" style={{ objectFit: "cover" }} />

        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: "6px",
            opacity: 0,
            transition: "opacity .15s ease-out",
          }}
          className="artist-card-actions"
        >
          <IconAction
            label={`Edit ${artist.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <EditIcon sx={{ fontSize: 14 }} />
          </IconAction>
          <IconAction
            label={`Delete ${artist.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            danger
          >
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconAction>
        </Box>

        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            px: 1.5,
            py: 1.25,
            textAlign: "center",
            bgcolor: "rgba(25,25,25,.72)",
            backdropFilter: "blur(16px)",
          }}
        >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {artist.name}
          </Typography>
        </Box>
      </InvertedCornerBox>
    </Box>
  );
}

function IconAction({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <Box
      component="span"
      role="button"
      aria-label={label}
      onClick={onClick}
      sx={{
        width: 26,
        height: 26,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(25,25,25,.72)",
        color: danger ? "#f64e34" : "#ffffff",
        backdropFilter: "blur(12px)",
        "&:hover": { bgcolor: danger ? "rgba(246,78,52,.24)" : "rgba(231,188,15,.24)" },
      }}
    >
      {children}
    </Box>
  );
}
