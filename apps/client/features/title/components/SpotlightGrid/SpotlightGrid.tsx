"use client";

import Box from "@mui/material/Box";
import SpotlightTile, { type SpotlightTitle } from "./SpotlightTile";

interface SpotlightGridProps {
  feature: SpotlightTitle;
  secondary: SpotlightTitle;
  tall: SpotlightTitle;
}

export default function SpotlightGrid({ feature, secondary, tall }: SpotlightGridProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: "16px",
        gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
        gridTemplateAreas: { xs: `"feature" "secondary" "tall"`, md: `"feature tall" "secondary tall"` },
      }}
    >
      <Box sx={{ gridArea: "feature", aspectRatio: "2 / 1" }}>
        <SpotlightTile
          title={feature}
          variant="editorial"
          actionPosition="bottom-right"
          titleScale={8}
          imageSizes="(max-width: 900px) 100vw, 60vw"
        />
      </Box>
      <Box sx={{ gridArea: "secondary", aspectRatio: "2 / 1" }}>
        <SpotlightTile
          title={secondary}
          variant="poster"
          actionPosition="top-left"
          titleScale={8.6}
          imageSizes="(max-width: 900px) 100vw, 60vw"
        />
      </Box>
      <Box sx={{ gridArea: "tall", aspectRatio: { xs: "3 / 4", md: "auto" } }}>
        <SpotlightTile
          title={tall}
          variant="poster"
          actionPosition="top-left"
          titleScale={14.5}
          imageSizes="(max-width: 900px) 100vw, 30vw"
        />
      </Box>
    </Box>
  );
}
