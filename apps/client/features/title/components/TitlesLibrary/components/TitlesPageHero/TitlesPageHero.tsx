"use client";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";

interface TitlesPageHeroProps {
  onCreate: () => void;
}

export default function TitlesPageHero({ onCreate }: TitlesPageHeroProps) {
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

      <Button variant="contained" onClick={onCreate} startIcon={<AddIcon sx={{ fontSize: 22 }} />}>
        Add New
      </Button>
    </Box>
  );
}
