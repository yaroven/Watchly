import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";

interface UploadProgressProps {
  progress: number;
}

export default function UploadProgress({ progress }: UploadProgressProps) {
  const format = useFormatter();
  const t = useTranslations("common");
  const labelId = useId();
  const value = Math.min(100, Math.max(0, progress));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
        <Typography id={labelId} sx={{ fontSize: "13px", color: tokens.text.secondary }}>
          {t("uploading")}
        </Typography>
        <Typography sx={{ fontSize: "13px", fontWeight: 600, color: tokens.text.primary, fontVariantNumeric: "tabular-nums" }}>
          {format.number(value / 100, { style: "percent", maximumFractionDigits: 0 })}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        aria-labelledby={labelId}
        sx={{
          height: 6,
          borderRadius: "999px",
          backgroundColor: tokens.surface.fill,
          "& .MuiLinearProgress-bar": { borderRadius: "999px", transition: "transform .4s cubic-bezier(.16,1,.3,1)" },
        }}
      />
    </Box>
  );
}
