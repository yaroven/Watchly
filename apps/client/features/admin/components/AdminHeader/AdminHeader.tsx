"use client";

import { Search as SearchIcon } from "@mui/icons-material";
import { Box, Input, InputAdornment, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ADMIN } from "@shared/lib/routes";
import { inputVariants, tokens } from "@shared/mui/theme";
import Avatar from "@shared/ui/Header/components/Avatar";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  titles: "Content Management",
};

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");

  const sectionKey = pathname.split("/")[2] || "dashboard";
  const currentSection = SECTION_LABELS[sectionKey] || "Admin";

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    router.push(trimmed ? `${ADMIN.TITLES}?search=${encodeURIComponent(trimmed)}` : ADMIN.TITLES);
  };

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        pl: "32px",
        pr: "24px",
        pt: "28px",
        pb: "24px",
        backgroundColor: tokens.surface.default,
        borderBottom: "1px solid",
        borderColor: tokens.border.subtle,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        <Box>
          <Typography
            sx={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }}
          >
            Admin Panel
          </Typography>
          <Typography variant="h4" sx={{ color: "#ffffff", mt: "4px" }}>
            {currentSection}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Box component="form" onSubmit={handleSearchSubmit}>
            <Input
              disableUnderline
              placeholder="Search titles..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "#999999" }} />
                </InputAdornment>
              }
              sx={{
                ...inputVariants.pill,
                width: 260,
                border: "1px solid",
                borderColor: tokens.border.subtle,
                gap: "10px",
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              pl: "12px",
              pr: "18px",
              py: "6px",
              borderRadius: "999px",
              border: "1px solid",
              borderColor: alpha(tokens.border.subtle, 0.8),
            }}
          >
            {/* PLACEHOLDER: no auth/session yet — needs a real logged-in user (name + avatarUrl) endpoint */}
            <Avatar src="https://www.svgrepo.com/show/384670/account-avatar-profile-user.svg" alt="Admin user" />
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {/* PLACEHOLDER: no auth/session yet — needs a real logged-in admin user endpoint */}
              <Typography sx={{ fontSize: "16px", fontWeight: 600, color: "#ffffff" }}>Admin User</Typography>
              <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>Super Admin</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
