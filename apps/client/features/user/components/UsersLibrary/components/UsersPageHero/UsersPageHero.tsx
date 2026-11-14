"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

interface UsersPageHeroProps {
  totalCount: number;
}

export default function UsersPageHero({ totalCount }: UsersPageHeroProps) {
  const t = useTranslations("user");

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
          {t("library.title")}
        </Typography>
        <Typography sx={{ mt: "14px", maxWidth: "640px", color: "text.secondary" }}>{t("library.subtitle")}</Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <Typography
          sx={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}
        >
          {t("library.total")}
        </Typography>
        <Typography sx={{ fontSize: "32px", fontWeight: 800, color: "primary.main", lineHeight: 1.2 }}>{totalCount}</Typography>
      </Box>
    </Box>
  );
}
