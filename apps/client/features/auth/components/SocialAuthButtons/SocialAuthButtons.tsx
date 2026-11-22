import AppleIcon from "@mui/icons-material/Apple";
import FacebookIcon from "@mui/icons-material/Facebook";
import GoogleIcon from "@mui/icons-material/Google";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import { useTranslations } from "next-intl";

const PROVIDERS = [
  { id: "google", icon: GoogleIcon },
  { id: "apple", icon: AppleIcon },
  { id: "facebook", icon: FacebookIcon },
] as const;

export default function SocialAuthButtons() {
  const t = useTranslations("auth.social");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Box sx={{ flex: 1, height: "1px", backgroundColor: "divider" }} />
        <Typography sx={{ fontSize: "14px", color: "text.secondary", whiteSpace: "nowrap" }}>{t("divider")}</Typography>
        <Box sx={{ flex: 1, height: "1px", backgroundColor: "divider" }} />
      </Box>

      <Box sx={{ display: "flex", gap: "16px" }}>
        {PROVIDERS.map(({ id, icon: Icon }) => (
          <Box
            key={id}
            component="button"
            type="button"
            aria-label={t(`provider.${id}`)}
            disabled
            sx={{
              flex: 1,
              height: "52px",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "12px",
              backgroundColor: "#141414",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "not-allowed",
            }}
          >
            <Icon sx={{ fontSize: "22px", color: tokens.text.primary }} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
