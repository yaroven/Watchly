"use client";

import TitleForm from "@/features/title/components/TitleForm";
import { ADMIN } from "@/shared/lib/routes";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import Link from "next/link";

export default function TitleCreate() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "22px", padding: { xs: "24px 16px 40px", md: "28px 36px 56px" } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: tokens.text.placeholder }}>
          <Typography component={Link} href={ADMIN.TITLES} sx={{ fontSize: "13px", color: "text.secondary", textDecoration: "none" }}>
            Titles
          </Typography>
          <span>/</span>
          <Typography component="span" sx={{ fontSize: "13px", color: tokens.text.field }}>
            New title
          </Typography>
        </Box>
      </Box>

      <Box sx={{ pb: "22px", borderBottom: `1px solid ${tokens.border.subtle}` }}>
        <Typography component="h1" variant="h2" sx={{ color: "#ffffff" }}>
          Create Title
        </Typography>
        <Typography sx={{ mt: "12px", maxWidth: "620px", color: "text.secondary" }}>
          Add a movie or series to the library. Metadata saves first, then the video uploads in the background.
        </Typography>
      </Box>

      <TitleForm />
    </Box>
  );
}
