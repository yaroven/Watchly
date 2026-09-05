"use client";

import { APP } from "@/shared/lib/routes";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import { useEffect } from "react";

/**
 * Error boundary for the public site. It renders inside (main)/layout, so the
 * site frame comes from there — adding it here would duplicate the header.
 */
export default function MainError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh", py: "48px" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center", textAlign: "center", maxWidth: 460 }}>
        <Box
          sx={{
            width: 58,
            height: 58,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "18px",
            backgroundColor: "rgba(246,78,52,.16)",
          }}
        >
          <ReportProblemIcon sx={{ fontSize: "28px", color: "#f64e34" }} />
        </Box>

        <Typography sx={{ fontSize: "24px", fontWeight: 700, color: "#ffffff" }}>Something went wrong</Typography>

        <Typography sx={{ fontSize: "14px", color: "#999999", lineHeight: 1.5 }}>
          This page could not be loaded. You can try again, or head back to the catalog.
        </Typography>

        <Box sx={{ display: "flex", gap: "12px" }}>
          <Button variant="outlined" href={APP.DISCOVER}>
            Go Home
          </Button>
          <Button onClick={reset}>Try Again</Button>
        </Box>
      </Box>
    </Box>
  );
}
