"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface UsersPageHeroProps {
  totalCount: number;
}

export default function UsersPageHero({ totalCount }: UsersPageHeroProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        width: "100%",
        gap: "24px",
        pb: "28px",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box>
        <Typography component="h1" variant="h2" sx={{ color: "#ffffff" }}>
          Users
        </Typography>
        <Typography sx={{ mt: "14px", maxWidth: "640px", color: "text.secondary" }}>Review accounts and manage admin access.</Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <Typography
          sx={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}
        >
          Total Users
        </Typography>
        <Typography sx={{ fontSize: "32px", fontWeight: 800, color: "primary.main", lineHeight: 1.2 }}>{totalCount}</Typography>
      </Box>
    </Box>
  );
}
