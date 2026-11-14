"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { APP } from "@/shared/lib/routes";
import { Box, Tab } from "@mui/material";
import Tabs from "@mui/material/Tabs";
import Avatar from "@shared/ui/Avatar";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Notification from "./components/Notification";
import SearchBar from "./components/SearchBar";

export default function Header() {
  const t = useTranslations("shared.header");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSearchPage = pathname === APP.SEARCH();
  const [query, setQuery] = useState(() => (isSearchPage ? (searchParams.get("q") ?? "") : ""));

  const submitSearch = () => {
    const trimmed = query.trim();
    if (trimmed) router.push(APP.SEARCH({ q: trimmed }));
  };

  const navItems = [
    { label: t("nav.all"), href: APP.DISCOVER },
    { label: t("nav.movies"), href: APP.MOVIES },
    { label: t("nav.series"), href: APP.SERIES_LIST },
    { label: t("nav.genres"), href: APP.GENRES },
  ];
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
        <SearchBar
          key={isSearchPage ? searchParams.toString() : "idle"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitSearch();
          }}
        />
        <Notification hasNotifications={false} />
        <Avatar src="https://www.svgrepo.com/show/384670/account-avatar-profile-user.svg" alt={t("profileAlt")} />
      </Box>
    </Box>
  );
}
