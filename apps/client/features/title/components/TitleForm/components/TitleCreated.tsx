"use client";

import { AGE_RATING_LABELS } from "@/features/title/components/TitleForm/components/AgeRatingPicker";
import { Title, TitleType } from "@/features/title/schemas/title";
import { ADMIN } from "@/shared/lib/routes";
import TranscodingStatus from "@/types/transcoding-status";
import CheckIcon from "@mui/icons-material/Check";
import GroupsIcon from "@mui/icons-material/Groups";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import InvertedCornerBox from "@shared/ui/InvertedCornerBox";
import type { ReactNode } from "react";

interface TitleCreatedProps {
  title: Title;
  onCreateAnother: () => void;
}

export default function TitleCreated({ title, onCreateAnother }: TitleCreatedProps) {
  const isSeries = title.type === TitleType.SERIES;
  const releaseYear = title.releaseDate?.slice(0, 4);

  const chips = [isSeries ? "Series" : "Movie", releaseYear, title.runtime ? `${title.runtime} min` : null].filter(Boolean) as string[];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "300px minmax(0, 1fr)" },
        gap: "32px",
        alignItems: "start",
        p: "28px",
        backgroundColor: tokens.surface.paper,
        border: `1px solid ${tokens.border.subtle}`,
        borderRadius: "12px",
      }}
    >
      <InvertedCornerBox
        sx={{
          width: "100%",
          aspectRatio: "2 / 3",
          borderRadius: 26,
          border: `1px solid ${tokens.border.subtle}`,
          backgroundColor: tokens.surface.fill,
          backgroundImage: title.posterUrl ? `url(${title.posterUrl})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            p: "22px 24px 26px",
            background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.88) 62%)",
          }}
        >
          <Typography
            sx={{ fontFamily: "var(--font-display)", fontSize: "28px", lineHeight: 1.05, textTransform: "uppercase", color: "#ffffff" }}
          >
            {title.name}
          </Typography>
        </Box>
      </InvertedCornerBox>

      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              backgroundColor: alpha(tokens.feedback.success, 0.16),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckIcon sx={{ fontSize: 20, color: tokens.feedback.success }} />
          </Box>
          <Typography component="h2" variant="h3" sx={{ color: "#ffffff" }}>
            {title.name} is in the library
          </Typography>
        </Box>

        <Box sx={{ mt: "14px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {chips.map((chip) => (
            <Typography
              key={chip}
              sx={{
                px: "12px",
                py: "5px",
                borderRadius: "999px",
                backgroundColor: tokens.surface.fill,
                fontSize: "12px",
                color: tokens.text.field,
              }}
            >
              {chip}
            </Typography>
          ))}
          {title.ageRating && (
            <Typography
              sx={{
                px: "12px",
                py: "5px",
                borderRadius: "999px",
                border: `1px solid ${tokens.accent.primary}`,
                fontSize: "12px",
                color: "primary.main",
              }}
            >
              {AGE_RATING_LABELS[title.ageRating]}
            </Typography>
          )}
        </Box>

        <Typography sx={{ mt: "26px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.10em", color: tokens.text.placeholder }}>
          STILL TO DO
        </Typography>

        <Box sx={{ mt: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <TodoRow
            icon={<GroupsIcon sx={{ fontSize: 20, color: "primary.main" }} />}
            title="No cast assigned"
            description="Actors and their characters, in display order."
            action={
              <Button href={ADMIN.TITLES_EDIT(title.id)} variant="outlined">
                Add cast
              </Button>
            }
          />

          {isSeries ? (
            <TodoRow
              icon={<VideoLibraryIcon sx={{ fontSize: 20, color: "primary.main" }} />}
              title="No seasons yet"
              description="Add season 1, then upload its episodes one by one."
              action={
                <Button href={ADMIN.TITLES_EDIT(title.id)} variant="outlined">
                  Add seasons
                </Button>
              }
            />
          ) : (
            <TodoRow
              icon={<HourglassTopIcon sx={{ fontSize: 20, color: tokens.feedback.warning }} />}
              title={title.transcodingStatus === TranscodingStatus.COMPLETED ? "Video ready to play" : "Transcoding — not playable yet"}
              description="The library card shows Pending until this finishes."
              action={<Typography sx={{ fontSize: "13px", color: tokens.text.placeholder }}>Automatic</Typography>}
            />
          )}

          <TodoRow
            icon={<StarBorderIcon sx={{ fontSize: 20, color: "primary.main" }} />}
            title="No external ratings yet"
            description="IMDb, Rotten Tomatoes and Metacritic pull on demand."
            action={
              <Button href={ADMIN.TITLES_EDIT(title.id)} variant="outlined">
                Sync ratings
              </Button>
            }
          />
        </Box>

        <Box
          sx={{ mt: "26px", pt: "20px", borderTop: `1px dashed ${tokens.border.subtle}`, display: "flex", flexWrap: "wrap", gap: "12px" }}
        >
          <Button href={ADMIN.TITLES_EDIT(title.id)}>Open the title page</Button>
          <Button variant="outlined" onClick={onCreateAnother}>
            Create another
          </Button>
          <Button href={ADMIN.TITLES} variant="outlined">
            Back to library
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

function TodoRow({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action: ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        p: "14px 16px",
        borderRadius: "12px",
        backgroundColor: tokens.surface.dropzone,
        border: `1px solid ${tokens.border.subtle}`,
      }}
    >
      <Box sx={{ flexShrink: 0, display: "flex" }}>{icon}</Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>{title}</Typography>
        <Typography sx={{ mt: "3px", fontSize: "13px", color: "text.secondary" }}>{description}</Typography>
      </Box>
      {action}
    </Box>
  );
}
