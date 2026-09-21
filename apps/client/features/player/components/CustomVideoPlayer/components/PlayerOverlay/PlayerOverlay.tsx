import AutorenewIcon from "@mui/icons-material/Autorenew";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Box from "@mui/material/Box";

interface PlayerOverlayProps {
  isPlaying: boolean;
  isInitialLoading: boolean;
  errorMessage: string | null;
  onPlay: () => void;
}

// shared centering rule for the loader spinner and the center play button
const centeredOverlaySx = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 10,
  color: "white",
  pointerEvents: "auto",
};

export default function PlayerOverlay({ isPlaying, isInitialLoading, errorMessage, onPlay }: PlayerOverlayProps) {
  if (errorMessage)
    return (
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          zIndex: 10,
          maxWidth: "min(420px, calc(100% - 32px))",
          transform: "translate(-50%, -50%)",
          borderRadius: "8px",
          background: "rgba(0, 0, 0, 0.7)",
          color: "#fff",
          padding: "12px 16px",
          textAlign: "center",
        }}
      >
        {errorMessage}
      </Box>
    );

  if (isInitialLoading)
    return (
      <AutorenewIcon
        sx={[
          centeredOverlaySx,
          {
            fontSize: 64,
            animation: "rotating 2s linear infinite",
            "@keyframes rotating": {
              from: { transform: "translate(-50%, -50%) rotate(0deg)" },
              to: { transform: "translate(-50%, -50%) rotate(360deg)" },
            },
          },
        ]}
      />
    );

  if (isPlaying) return null;

  return (
    <Box
      component="button"
      type="button"
      onClick={onPlay}
      aria-label="Play video"
      sx={[
        centeredOverlaySx,
        {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "88px",
          height: "88px",
          border: 0,
          borderRadius: "50%",
          background: "rgba(0, 0, 0, 0.45)",
          color: "white",
          transition: "transform 0.2s ease-in-out",
          cursor: "pointer",
          "&:hover": { transform: "translate(-50%, -50%) scale(1.1)" },
          "&:focus-visible": { outline: "2px solid #fff", outlineOffset: "4px" },
        },
      ]}
    >
      <PlayArrowIcon sx={{ fontSize: 64 }} />
    </Box>
  );
}
