import AutorenewIcon from "@mui/icons-material/Autorenew";

interface PageLoaderProps {
  size?: number;
}

export default function Loader({ size = 64 }: PageLoaderProps) {
  return (
    <AutorenewIcon
      sx={{
        fontSize: size,
        color: "#ffffff",
        pointerEvents: "auto",
        animation: "spin 2s linear infinite",
        "@keyframes spin": { to: { transform: "rotate(360deg)" } },
      }}
    />
  );
}
