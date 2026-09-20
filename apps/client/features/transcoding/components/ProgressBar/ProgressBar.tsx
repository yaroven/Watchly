import Box from "@mui/material/Box";

interface ProgressBarProps {
  bgColor?: string;
  progress: number;
}

export default function ProgressBar({ bgColor, progress }: ProgressBarProps) {
  return (
    <Box sx={{ height: "20px", width: "100%", backgroundColor: "#e0e0de", borderRadius: "50px" }}>
      <Box
        sx={{
          height: "100%",
          borderRadius: "inherit",
          textAlign: "right",
          transition: "width 0.5s ease-in-out",
          backgroundColor: bgColor || "#ca563f",
          width: `${progress}%`,
        }}
      >
        <Box component="span" sx={{ padding: "5px", color: "#ffffff", fontWeight: "bold" }}>
          {progress}%
        </Box>
      </Box>
    </Box>
  );
}
