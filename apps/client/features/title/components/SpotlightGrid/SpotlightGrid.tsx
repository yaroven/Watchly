"use client";

import Box from "@mui/material/Box";
import SpotlightTile, { type SpotlightTitle } from "./SpotlightTile";

interface SpotlightGridProps {
  /** Wide slot, top left: the one title that gets a description. */
  feature: SpotlightTitle;
  /** Wide slot, bottom left. */
  secondary: SpotlightTitle;
  /** Narrow slot on the right, as tall as the other two together. */
  tall: SpotlightTitle;
}

// Named slots rather than an array: the section is a fixed editorial layout,
// so the order can't be got wrong and each slot's role stays readable.
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
      {/* The wide tiles' aspect ratio sets both row heights; the tall tile is
          named in both rows, so it stretches across them on its own. Its
          titleScale is far higher because it is barely half as wide, and the
          design fills each tile's width with its name either way. */}
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
