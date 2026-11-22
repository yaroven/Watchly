import AutorenewIcon from "@mui/icons-material/Autorenew";
import { tokens } from "@shared/mui/theme";

interface PageLoaderProps {
  size?: number;
}

export default function Loader({ size = 64 }: PageLoaderProps) {
  return (
    <AutorenewIcon
      sx={{
        fontSize: size,
        color: tokens.text.primary,
        pointerEvents: "auto",
        animation: "spin 2s linear infinite",
        "@keyframes spin": { to: { transform: "rotate(360deg)" } },
      }}
    />
  );
}
