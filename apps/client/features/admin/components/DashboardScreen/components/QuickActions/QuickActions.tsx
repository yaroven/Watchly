"use client";

import { ADMIN } from "@/shared/lib/routes";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ListAltIcon from "@mui/icons-material/ListAlt";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import GradientCard from "@shared/ui/GradientCard";
import { useRouter } from "next/navigation";

const ACTIONS = [
  { label: "Add New Title", icon: <AddCircleIcon sx={{ fontSize: 22 }} />, to: ADMIN.TITLES_NEW },
  { label: "Manage All Titles", icon: <ListAltIcon sx={{ fontSize: 22 }} />, to: ADMIN.TITLES },
  { label: "Overview", icon: <DashboardIcon sx={{ fontSize: 22 }} />, to: ADMIN.ROOT },
];

export default function QuickActions() {
  const router = useRouter();

  return (
    <GradientCard sx={{ padding: "28px", display: "flex", flexDirection: "column", gap: "22px" }}>
      <Typography variant="h5" sx={{ color: "text.primary" }}>
        Quick Actions
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        {ACTIONS.map(({ label, icon, to }) => (
          <GradientCard
            key={label}
            interactive
            radius={16}
            onClick={() => router.push(to)}
            sx={{
              padding: "20px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              textAlign: "center",
            }}
          >
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
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "text.primary" }}>{label}</Typography>
          </GradientCard>
        ))}
      </Box>
    </GradientCard>
  );
}
