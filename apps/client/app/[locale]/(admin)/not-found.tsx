import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ADMIN } from "@shared/lib/routes";
import Button from "@shared/ui/Button";
import GradientCard from "@shared/ui/GradientCard";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("admin");

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh", padding: "40px" }}>
      <GradientCard sx={{ p: "48px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
        <Typography sx={{ fontSize: "72px", fontWeight: 800, color: "primary.main", lineHeight: 1 }}>404</Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Typography
            sx={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }}
          >
            {t("header.panel")}
          </Typography>
          <Typography component="h1" variant="h4" sx={{ color: "#ffffff" }}>
            {t("notFound.title")}
          </Typography>
          <Typography sx={{ color: "text.secondary", maxWidth: "420px" }}>{t("notFound.description")}</Typography>
        </Box>

        <Button href={ADMIN.DASHBOARD}>{t("notFound.backToDashboard")}</Button>
      </GradientCard>
    </Box>
  );
}
