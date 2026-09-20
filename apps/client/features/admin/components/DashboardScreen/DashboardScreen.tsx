"use client";

import useTitles from "@/features/title/api/use-titles";
import { TitleType } from "@/features/title/schemas/title";
import MovieIcon from "@mui/icons-material/Movie";
import TheatersIcon from "@mui/icons-material/Theaters";
import TvIcon from "@mui/icons-material/Tv";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import QuickActions from "./components/QuickActions";
import RecentAdditions from "./components/RecentAdditions";
import StatCard from "./components/StatCard";

export default function DashboardScreen() {
  const { data: allTitles, isPending: isAllTitlesPending } = useTitles({ limit: 1 });

  const { data: movies, isPending: isMoviesPending } = useTitles({ limit: 1, type: TitleType.MOVIE });

  const { data: series, isPending: isSeriesPending } = useTitles({ limit: 1, type: TitleType.SERIES });

  const stats = [
    {
      label: "Total Titles",
      value: allTitles?.totalCount || 0,
      icon: <TheatersIcon sx={{ fontSize: 24 }} />,
      loading: isAllTitlesPending,
    },
    { label: "Movies", value: movies?.totalCount || 0, icon: <MovieIcon sx={{ fontSize: 24 }} />, loading: isMoviesPending },
    { label: "Series", value: series?.totalCount || 0, icon: <TvIcon sx={{ fontSize: 24 }} />, loading: isSeriesPending },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "28px",
        padding: { xs: "24px 16px 40px", md: "40px 36px 56px" },
      }}
    >
      <Box sx={{ paddingBottom: "28px", borderBottom: "1px solid #333333" }}>
        <Typography component="h1" variant="h1" sx={{ color: "text.primary" }}>
          Admin Overview
        </Typography>
        <Typography sx={{ marginTop: "14px", maxWidth: "680px", color: "text.secondary" }}>
          Monitor your catalog, jump into common tasks, and keep the content pipeline moving.
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(240px, 1fr))" }, gap: "22px" }}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: "24px", alignItems: "start" }}>
        <QuickActions />
        <RecentAdditions />
      </Box>
    </Box>
  );
}
