"use client";

import { APP } from "@/shared/lib/routes";
import { Box, Tab } from "@mui/material";
import Tabs from "@mui/material/Tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "./components/Avatar";
import Notification from "./components/Notification";
import SearchBar from "./components/SearchBar";

export default function Header() {
  const pathname = usePathname();
  const navItems = [
    { label: "All", href: APP.DISCOVER },
    { label: "Movies", href: APP.MOVIES },
    { label: "Series", href: APP.SERIES_LIST },
    { label: "Genres", href: APP.GENRES },
  ];
  // Longest match wins, so /discover/movie selects Movies rather than All.
  const activeTab =
    navItems.filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]
      ?.href ?? false;

  return (
    <Box sx={{ pl: "32px", pr: "24px", pt: "32px", pb: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Tabs value={activeTab}>
        {navItems.map((item) => (
          <Tab
            key={item.href}
            sx={{ px: "11px", py: "9px", fontSize: "20px", minWidth: "auto", width: "fit-content" }}
            label={item.label}
            value={item.href}
            href={item.href}
            component={Link}
          />
        ))}
      </Tabs>
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "20px" }}>
        <SearchBar />
        {/* PLACEHOLDER: no notifications endpoint yet — always renders as read */}
        <Notification hasNotifications={false} />
        {/* PLACEHOLDER: no auth/session yet — needs a real logged-in user (name + avatarUrl) endpoint */}
        <Avatar src="https://www.svgrepo.com/show/384670/account-avatar-profile-user.svg" alt="User profile" />
      </Box>
    </Box>
  );
}
