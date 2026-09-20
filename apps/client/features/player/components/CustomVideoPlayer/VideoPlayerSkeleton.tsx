import Box from "@mui/material/Box";

export default function VideoPlayerSkeleton() {
  return (
    <Box
      sx={{
        backgroundColor: "#1a1a1a",
        background: "linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)",
        backgroundSize: "200% 100%",
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        aspectRatio: "16 / 9",
        animation: "shimmer 1.5s infinite",
        "@keyframes shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
          color: "white",
          pointerEvents: "auto",
          animation: "rotating 2s linear infinite",
          "@keyframes rotating": {
            from: { transform: "translate(-50%, -50%) rotate(0deg)" },
            to: { transform: "translate(-50%, -50%) rotate(360deg)" },
          },
        }}
        style={{ opacity: 0.5 }}
      >
        {/* Placeholder for the loader icon if needed, but the shimmer should suffice */}
      </Box>
    </Box>
  );
}
