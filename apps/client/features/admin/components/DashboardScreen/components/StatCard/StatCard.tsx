import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import GradientCard from "@shared/ui/GradientCard";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  loading?: boolean;
}

export default function StatCard({ label, value, icon, loading }: StatCardProps) {
  return (
    <GradientCard sx={{ padding: "26px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {loading ? (
        <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: "14px" }} />
      ) : (
        <Box
          sx={{
            width: "48px",
            height: "48px",
            flexShrink: 0,
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "primary.main",
            background: "radial-gradient(circle, rgba(231, 188, 15, 0.18) 0%, rgba(231, 188, 15, 0.04) 70%)",
          }}
        >
          {icon}
        </Box>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Typography
          sx={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "text.secondary" }}
        >
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={64} height={46} sx={{ fontSize: "38px" }} />
        ) : (
          <Typography sx={{ fontSize: "38px", fontWeight: 800, lineHeight: 1, color: "text.primary" }}>{value}</Typography>
        )}
        <Box sx={{ width: "32px", height: "3px", borderRadius: "2px", backgroundColor: "primary.main" }} />
      </Box>
    </GradientCard>
  );
}
