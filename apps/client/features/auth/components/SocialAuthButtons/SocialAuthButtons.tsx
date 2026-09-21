import AppleIcon from "@mui/icons-material/Apple";
import FacebookIcon from "@mui/icons-material/Facebook";
import GoogleIcon from "@mui/icons-material/Google";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// PLACEHOLDER: no OAuth provider is wired up yet — these are non-functional
// until the backend adds Google/Apple/Facebook sign-in.
const PROVIDERS = [
  { icon: GoogleIcon, label: "Continue with Google" },
  { icon: AppleIcon, label: "Continue with Apple" },
  { icon: FacebookIcon, label: "Continue with Facebook" },
];

export default function SocialAuthButtons() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Box sx={{ flex: 1, height: "1px", backgroundColor: "divider" }} />
        <Typography sx={{ fontSize: "14px", color: "text.secondary", whiteSpace: "nowrap" }}>Continue With</Typography>
        <Box sx={{ flex: 1, height: "1px", backgroundColor: "divider" }} />
      </Box>

      <Box sx={{ display: "flex", gap: "16px" }}>
        {PROVIDERS.map(({ icon: Icon, label }) => (
          <Box
            key={label}
            component="button"
            type="button"
            aria-label={label}
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
            <Icon sx={{ fontSize: "22px", color: "#ffffff" }} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
