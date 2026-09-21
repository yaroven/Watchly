import ExpandMore from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = ["Home", "About", "Contact"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#000000" }}>
      <Box
        sx={{
          position: "relative",
          height: "100vh",
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          overflow: "hidden",
        }}
      >
        <Image
          src="/LoginBreakingBad.png"
          alt=""
          width={832}
          height={1024}
          priority
          style={{ height: "100%", width: "auto", display: "block", objectFit: "contain" }}
        />

        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: "32px",
            px: "48px",
            py: "32px",
          }}
        >
          {NAV_LINKS.map((label) => (
            // PLACEHOLDER: marketing pages (Home/About/Contact) don't exist yet.
            <Typography key={label} sx={{ fontWeight: 700, fontSize: "16px", color: "#ffffff", cursor: "default" }}>
              {label}
            </Typography>
          ))}

          <Box sx={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "#ffffff", cursor: "default" }}>
            English
            <ExpandMore sx={{ fontSize: "18px" }} />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          position: "relative",
          flex: "1 1 45%",
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: "32px",
        }}
      >
        <Link href="/" style={{ position: "absolute", top: 32, right: 48 }}>
          <Image src="/logo.png" alt="Watchly" width={140} height={31} />
        </Link>
        {children}
      </Box>
    </Box>
  );
}
