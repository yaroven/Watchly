"use client";

import useArtistFilmography from "@/features/artist/api/use-artist-filmography";
import { useArtist } from "@/features/artist/api/use-artists";
import ArtistModal from "@/features/artist/components/ArtistModal";
import { Artist } from "@/features/artist/schemas/artist";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { ADMIN } from "@/shared/lib/routes";
import EditIcon from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import InvertedCornerBox from "@shared/ui/InvertedCornerBox";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface ArtistDetailProps {
  artist: Artist;
}

export default function ArtistDetail({ artist: initialArtist }: ArtistDetailProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { data: artist = initialArtist } = useArtist(initialArtist.id, { initialData: initialArtist });
  const { data: filmography, isPending } = useArtistFilmography(artist.id);
  const photoSrc = getOptimizedImageSrc(artist.photoUrl ?? undefined);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "28px", padding: { xs: "24px 16px 40px", md: "40px 36px 56px" } }}>
      <Box sx={{ display: "flex", width: "100%", flexDirection: { xs: "column", md: "row" } }}>
        <InvertedCornerBox
          corners={["top left", "top right", "bottom left", "bottom right"]}
          omitBorderSide="right"
          sx={{
            borderRadius: "36px",
            border: "2px solid #666666",
            width: { xs: "100%", md: "clamp(220px, 22vw, 320px)" },
            aspectRatio: "3 / 4",
            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Image src={photoSrc} alt={artist.name} fill sizes="(max-width: 900px) 100vw, 22vw" style={{ objectFit: "cover" }} priority />
        </InvertedCornerBox>

        <InvertedCornerBox
          corners={["top left", "top right", "bottom left", "bottom right"]}
          omitBorderSide="left"
          sx={{
            position: "relative",
            overflow: "hidden",
            paddingX: "32px",
            paddingY: "40px",
            borderRadius: "36px",
            border: "2px solid #666666",
            backgroundColor: "transparent",
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "18px",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              borderLeft: "2px dashed #B2B2B2",
              zIndex: 2,
              display: { xs: "none", md: "block" },
            }}
          />

          <Typography component="h1" variant="h2" sx={{ color: "#ffffff" }}>
            {artist.name}
          </Typography>

          <Typography sx={{ color: "text.secondary" }}>
            {filmography?.length ? `Credited on ${filmography.length} title(s).` : "No cast credits yet."}
          </Typography>

          <Box>
            <Button variant="outlined" onClick={() => setIsEditOpen(true)} startIcon={<EditIcon sx={{ fontSize: 16 }} />}>
              Edit Actor
            </Button>
          </Box>
        </InvertedCornerBox>
      </Box>

      <Box>
        <Typography component="h2" variant="h4" sx={{ color: "#ffffff", mb: "20px" }}>
          Filmography
        </Typography>

        {isPending ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} variant="rounded" width={160} height={246} sx={{ borderRadius: "8px" }} />
            ))}
          </Box>
        ) : filmography?.length ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
            {filmography.map((credit) => (
              <Link
                key={credit.titleId}
                href={ADMIN.TITLES_EDIT(credit.titleId)}
                style={{ display: "block", width: "clamp(140px, 13vw, 200px)" }}
              >
                <Box
                  sx={{
                    position: "relative",
                    borderRadius: "8px",
                    overflow: "hidden",
                    aspectRatio: "177 / 246",
                    "&:hover": { outline: "2px solid", outlineColor: "primary.main" },
                  }}
                >
                  <Image
                    src={getOptimizedImageSrc(credit.posterUrl ?? undefined)}
                    alt=""
                    fill
                    sizes="13vw"
                    style={{ objectFit: "cover" }}
                  />
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
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {credit.name}
                    </Typography>
                    {credit.character && (
                      <Typography sx={{ fontSize: 12, color: "#e5e5e5", overflow: "hidden", textOverflow: "ellipsis" }}>
                        as {credit.character}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Link>
            ))}
          </Box>
        ) : (
          <Typography sx={{ color: "text.secondary" }}>This actor hasn&apos;t been credited on any titles yet.</Typography>
        )}
      </Box>

      <ArtistModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} artist={artist} />
    </Box>
  );
}
