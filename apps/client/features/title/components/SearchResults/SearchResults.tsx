"use client";

import useGenres from "@/features/genre/api/use-genres";
import useTitles from "@/features/title/api/use-titles";
import { Title, TitleType } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { APP } from "@/shared/lib/routes";
import ExpandMore from "@mui/icons-material/ExpandMore";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import Box from "@mui/material/Box";
import Input from "@mui/material/Input";
import MenuItem from "@mui/material/MenuItem";
import MuiSelect from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { IMDB } from "@shared/assets/icons";
import { inputVariants, tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import CustomIcon from "@shared/ui/CustomIcon";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getTitleOverviewFixture } from "../TitleOverview/mocks";

const FETCH_LIMIT = 60;
const PAGE_SIZE = 9;
const SKELETON_ROWS = Array.from({ length: 6 }, (_, index) => index);

const selectSx = {
  ...inputVariants.pill,
  height: 40,
  display: "flex",
  alignItems: "center",
  "& .MuiSelect-select": { padding: 0, minHeight: "unset", display: "flex", alignItems: "center", color: tokens.text.secondary },
  "& .MuiSelect-icon": { color: tokens.text.secondary, right: "12px" },
};

const menuProps = {
  slotProps: {
    paper: {
      sx: {
        mt: "4px",
        borderRadius: "12px",
        backgroundColor: tokens.surface.fill,
        backgroundImage: "none",
        border: `1px solid ${tokens.border.faint}`,
      },
    },
  },
};

// Movie/Series, Director, Network, and Genre are wired below. Age rating,
// Artist, Country, Order, and Quality have no equivalent filter yet
// (see PLACEHOLDER_DATA_BACKEND_TODO.md), so those still render disabled.
const DISABLED_FILTERS = [{ label: "Age rating" }, { label: "Artist" }, { label: "Country" }, { label: "Order" }, { label: "Quality" }];

function DisabledFilter({ label }: { label: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <Typography sx={{ width: "90px", flexShrink: 0, fontWeight: 600, color: "#ffffff" }}>{label}</Typography>
      <MuiSelect fullWidth displayEmpty value="" disabled MenuProps={menuProps} sx={selectSx}>
        <MenuItem value="">All</MenuItem>
      </MuiSelect>
    </Box>
  );
}

export default function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const typeFilter = (searchParams.get("type") as TitleType | null) ?? "";
  const directorFilter = searchParams.get("director") ?? "";
  const networkFilter = searchParams.get("network") ?? "";
  const genreIdFilter = searchParams.get("genreId") ?? "";
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Local, uncommitted text — only pushed to the URL (and so refetched) on Enter/blur,
  // same as the header search bar, instead of firing a request per keystroke.
  const [directorInput, setDirectorInput] = useState(directorFilter);
  const [networkInput, setNetworkInput] = useState(networkFilter);

  const { data: genresData } = useGenres();
  const genres = genresData?.items ?? [];

  const { data, isPending, isFetching } = useTitles({
    searchString: query,
    page: 1,
    limit: FETCH_LIMIT,
    type: typeFilter || undefined,
    director: directorFilter || undefined,
    network: networkFilter || undefined,
    genreId: genreIdFilter || undefined,
  });

  const items = data?.items ?? [];
  const visibleItems = items.slice(0, visibleCount);
  const loading = isPending || isFetching;

  const updateFilters = (next: Partial<{ type: TitleType | ""; director: string; network: string; genreId: string }>) => {
    setVisibleCount(PAGE_SIZE);
    router.push(
      APP.SEARCH({
        q: query || undefined,
        type: (next.type ?? typeFilter) || undefined,
        director: (next.director ?? directorFilter) || undefined,
        network: (next.network ?? networkFilter) || undefined,
        genreId: (next.genreId ?? genreIdFilter) || undefined,
      }),
      { scroll: false },
    );
  };

  const setType = (nextType: TitleType | "") => updateFilters({ type: nextType });

  const heading = query
    ? `The search results for "${query}"`
    : typeFilter === TitleType.MOVIE
      ? "All Movies"
      : typeFilter === TitleType.SERIES
        ? "All Series"
        : "All Titles";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          p: "24px",
          borderRadius: "16px",
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "#141414",
        }}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, columnGap: "40px", rowGap: "16px" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Box sx={{ display: "flex", borderRadius: "999px", overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              {[TitleType.MOVIE, TitleType.SERIES].map((type) => (
                <Box
                  key={type}
                  component="button"
                  type="button"
                  onClick={() => setType(typeFilter === type ? "" : type)}
                  sx={{
                    border: 0,
                    font: "inherit",
                    cursor: "pointer",
                    px: "20px",
                    py: "8px",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: typeFilter === type ? "#191919" : "text.secondary",
                    backgroundColor: typeFilter === type ? "primary.main" : "transparent",
                    transition: "background-color .15s ease-out, color .15s ease-out",
                  }}
                >
                  {type === TitleType.MOVIE ? "Movie" : "Series"}
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Typography sx={{ width: "90px", flexShrink: 0, fontWeight: 600, color: "#ffffff" }}>Genre</Typography>
            <MuiSelect
              fullWidth
              displayEmpty
              value={genreIdFilter}
              onChange={(event) => updateFilters({ genreId: event.target.value })}
              MenuProps={menuProps}
              sx={selectSx}
            >
              <MenuItem value="">All</MenuItem>
              {genres.map((genre) => (
                <MenuItem key={genre.id} value={genre.id}>
                  {genre.name}
                </MenuItem>
              ))}
            </MuiSelect>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Typography sx={{ width: "90px", flexShrink: 0, fontWeight: 600, color: "#ffffff" }}>Director</Typography>
            <Input
              fullWidth
              disableUnderline
              placeholder="All"
              value={directorInput}
              onChange={(event) => setDirectorInput(event.target.value)}
              onBlur={() => updateFilters({ director: directorInput })}
              onKeyDown={(event) => {
                if (event.key === "Enter") updateFilters({ director: directorInput });
              }}
              sx={selectSx}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Typography sx={{ width: "90px", flexShrink: 0, fontWeight: 600, color: "#ffffff" }}>Network</Typography>
            <Input
              fullWidth
              disableUnderline
              placeholder="All"
              value={networkInput}
              onChange={(event) => setNetworkInput(event.target.value)}
              onBlur={() => updateFilters({ network: networkInput })}
              onKeyDown={(event) => {
                if (event.key === "Enter") updateFilters({ network: networkInput });
              }}
              sx={selectSx}
            />
          </Box>

          {DISABLED_FILTERS.map(({ label }) => (
            <DisabledFilter key={label} label={label} />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant="h3" sx={{ color: "#ffffff" }}>
          {heading}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {SKELETON_ROWS.map((row) => (
            <Box key={row} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: "24px" }}>
              {[0, 1, 2].map((col) => (
                <Box key={col} sx={{ display: "flex", gap: "14px" }}>
                  <Skeleton variant="rounded" width={90} height={128} sx={{ borderRadius: "8px", flexShrink: 0 }} />
                  <Box sx={{ flex: 1, pt: "8px" }}>
                    <Skeleton variant="text" width="80%" height={22} />
                    <Skeleton variant="text" width="40%" height={18} sx={{ mt: "6px" }} />
                    <Skeleton variant="rounded" width={60} height={20} sx={{ mt: "10px", borderRadius: "6px" }} />
                  </Box>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      ) : items.length ? (
        <>
          <ResultRows items={visibleItems} onOpen={(id) => router.push(APP.TITLE(id))} />

          {visibleCount < items.length && (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Button variant="outlined" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} sx={{ gap: "8px" }}>
                More
                <ExpandMore sx={{ fontSize: "18px" }} />
              </Button>
            </Box>
          )}
        </>
      ) : (
        <EmptyState
          message={query ? `No movies or series matched "${query}". Try a different title.` : "Nothing here yet. Check back later."}
        />
      )}
    </Box>
  );
}

function ResultRows({ items, onOpen }: { items: Title[]; onOpen: (id: string) => void }) {
  const rows: Title[][] = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: "24px", py: "20px" }}>
            {row.map((item) => (
              <ResultItem key={item.id} title={item} onClick={() => onOpen(item.id)} />
            ))}
          </Box>
          {rowIndex < rows.length - 1 && <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}
        </Box>
      ))}
    </Box>
  );
}

function ResultItem({ title, onClick }: { title: Title; onClick: () => void }) {
  const year = title.createdAt && !Number.isNaN(new Date(title.createdAt).getTime()) ? new Date(title.createdAt).getFullYear() : undefined;
  const { scores } = getTitleOverviewFixture(title.id);

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: "flex",
        gap: "14px",
        border: 0,
        background: "none",
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
        p: 0,
        "&:hover .search-result-title": { color: "primary.main" },
      }}
    >
      <Box sx={{ position: "relative", width: "90px", height: "128px", flexShrink: 0, borderRadius: "8px", overflow: "hidden" }}>
        <Image src={getOptimizedImageSrc(title.posterUrl)} alt="" fill sizes="90px" style={{ objectFit: "cover" }} />
      </Box>

      <Box sx={{ minWidth: 0, pt: "6px" }}>
        <Typography
          className="search-result-title"
          sx={{
            fontWeight: 700,
            color: "#ffffff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            transition: "color .15s ease-out",
          }}
        >
          {title.name}
        </Typography>
        {year && <Typography sx={{ mt: "4px", fontSize: "14px", color: "text.secondary" }}>{year}</Typography>}
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px", mt: "10px" }}>
          <CustomIcon icon={IMDB} sx={{ fontSize: "22px" }} />
          <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>{scores.imdb}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", py: "64px" }}>
      <SearchOffIcon sx={{ fontSize: "56px", color: "#444444" }} />
      <Typography sx={{ color: "text.secondary", textAlign: "center", maxWidth: "420px" }}>{message}</Typography>
    </Box>
  );
}
