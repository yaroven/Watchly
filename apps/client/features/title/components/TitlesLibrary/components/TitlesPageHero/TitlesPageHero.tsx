"use client";

import AddIcon from "@mui/icons-material/Add";
import SyncIcon from "@mui/icons-material/Sync";
import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

interface TitlesPageHeroProps {
  onCreate: () => void;
  onSyncAllRatings: () => void;
  isSyncingAllRatings: boolean;
}

export default function TitlesPageHero({ onCreate, onSyncAllRatings, isSyncingAllRatings }: TitlesPageHeroProps) {
  return (
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
      }}
    >
      <Box>
        <Typography component="h1" variant="h2" sx={{ color: "#ffffff" }}>
          Content Library
        </Typography>
        <Typography sx={{ mt: "14px", maxWidth: "640px", color: "text.secondary" }}>
          Manage movies, series, and publishing workflow from one place.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: "12px" }}>
        <Button
          variant="outlined"
          onClick={onSyncAllRatings}
          disabled={isSyncingAllRatings}
          startIcon={<SyncIcon sx={{ fontSize: 20, animation: isSyncingAllRatings ? `${spin} 1s linear infinite` : "none" }} />}
        >
          {isSyncingAllRatings ? "Syncing Ratings..." : "Sync All Ratings"}
        </Button>

        <Button variant="contained" onClick={onCreate} startIcon={<AddIcon sx={{ fontSize: 22 }} />}>
          Add New
        </Button>
      </Box>
    </Box>
  );
}
