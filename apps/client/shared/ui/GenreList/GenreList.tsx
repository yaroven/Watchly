import { Box, Divider } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { Fragment } from "react";

interface GenreListProps {
  genres: string[];
  /**
   * "comma" reads as prose and wraps naturally, so it suits copy sitting
   * beside a title. "divider" draws the gold pips the hero panel uses.
   */
  separator?: "comma" | "divider";
  sx?: SxProps<Theme>;
}

export default function GenreList({ genres, separator = "comma", sx }: GenreListProps) {
  if (!genres.length) return null;

  if (separator === "comma") {
    return (
      <Typography component="span" sx={[{ fontSize: "clamp(13px, 0.95vw, 18px)", fontWeight: 400 }, ...(Array.isArray(sx) ? sx : [sx])]}>
        {genres.join(", ")}
      </Typography>
    );
  }

  return (
    <Box sx={[{ display: "flex", gap: "6px", alignItems: "center" }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {genres.map((genre, index) => (
        <Fragment key={genre}>
          <Typography component="span" sx={{ fontSize: "14px", fontWeight: 300 }}>
            {genre}
          </Typography>
          {index < genres.length - 1 && (
            <Divider
              orientation="vertical"
              flexItem={false}
              sx={{ height: "6px", borderRightWidth: "1px", borderRadius: "100px", alignSelf: "center", borderColor: "primary.main" }}
            />
          )}
        </Fragment>
      ))}
    </Box>
  );
}
