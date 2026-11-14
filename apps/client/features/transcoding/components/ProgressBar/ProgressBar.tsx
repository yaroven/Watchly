import Box from "@mui/material/Box";
import { useFormatter } from "next-intl";

interface ProgressBarProps {
  bgColor?: string;
  progress: number;
}

export default function ProgressBar({ bgColor, progress }: ProgressBarProps) {
  const format = useFormatter();

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
          {format.number(progress / 100, { style: "percent", maximumFractionDigits: 0 })}
        </Box>
      </Box>
    </Box>
  );
}
