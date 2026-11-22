"use client";

import { TitleType } from "@/features/title/schemas/title";
import TranscodingStatus from "@/types/transcoding-status";
import CategoryIcon from "@mui/icons-material/Category";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FlagIcon from "@mui/icons-material/Flag";
import ReplayIcon from "@mui/icons-material/Replay";
import SearchIcon from "@mui/icons-material/Search";
import SellIcon from "@mui/icons-material/Sell";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import MuiSelect from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { inputVariants, tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import GradientCard from "@shared/ui/GradientCard";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useId } from "react";
import { TitlesPageFilters } from "../../types";

interface TitlesFiltersPanelProps {
  searchString: string;
  typeFilter: TitleType | "";
  statusFilter: TranscodingStatus | "";
  totalCount: number;
  hasActiveFilters: boolean;
  onUpdateFilters: (filters: TitlesPageFilters) => void;
  onResetFilters: () => void;
}

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

const labelSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  mb: "8px",
  color: tokens.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: "11px",
  fontWeight: 700,
};

function FilterField({ icon, label, primary, children }: { icon: ReactNode; label: string; primary?: boolean; children: ReactNode }) {
  const labelId = useId();
  return (
    <Box role="group" aria-labelledby={labelId} sx={{ minWidth: 0, opacity: primary ? 1 : 0.9 }}>
      <Box component="span" id={labelId} sx={labelSx}>
        {icon}
        {label}
      </Box>
      {children}
    </Box>
  );
}

export default function TitlesFiltersPanel({
  searchString,
  typeFilter,
  statusFilter,
  totalCount,
  hasActiveFilters,
  onUpdateFilters,
  onResetFilters,
}: TitlesFiltersPanelProps) {
  const t = useTranslations("title.library.filters");
  const tStatus = useTranslations("title.admin.status");

  return (
    <GradientCard radius={24} sx={{ width: "100%", p: "28px" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", mb: "24px" }}>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: "12px", color: "text.secondary" }}>
          <FilterAltIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("heading")}</Typography>
        </Box>

        {hasActiveFilters && (
          <Button variant="outlined" size="small" onClick={onResetFilters} startIcon={<ReplayIcon sx={{ fontSize: 16 }} />}>
            {t("reset")}
          </Button>
        )}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "minmax(0, 2.1fr) repeat(3, minmax(160px, 1fr))" },
          columnGap: "18px",
          rowGap: "20px",
          alignItems: "start",
        }}
      >
        <FilterField icon={<SearchIcon sx={{ fontSize: 14 }} />} label={t("search")} primary>
          <TextField
            variant="standard"
            placeholder={t("searchPlaceholder")}
            value={searchString}
            onChange={(e) => onUpdateFilters({ search: e.target.value })}
            fullWidth
            slotProps={{
              input: {
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 22, color: tokens.text.placeholder }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ "& .MuiInputBase-root": { ...inputVariants.pill, height: 48, fontSize: "16px" } }}
          />
        </FilterField>

        <FilterField icon={<CategoryIcon sx={{ fontSize: 14 }} />} label={t("type")}>
          <MuiSelect
            fullWidth
            displayEmpty
            value={typeFilter}
            onChange={(e) => onUpdateFilters({ type: e.target.value as TitleType | "" })}
            MenuProps={menuProps}
            sx={selectSx}
          >
            <MenuItem value="">{t("allTypes")}</MenuItem>
            <MenuItem value={TitleType.MOVIE}>{t("movies")}</MenuItem>
            <MenuItem value={TitleType.SERIES}>{t("series")}</MenuItem>
          </MuiSelect>
        </FilterField>

        <FilterField icon={<SellIcon sx={{ fontSize: 14 }} />} label={t("genre")}>
          <MuiSelect fullWidth displayEmpty value="" disabled MenuProps={menuProps} sx={selectSx}>
            <MenuItem value="">{t("allGenres")}</MenuItem>
          </MuiSelect>
        </FilterField>

        <FilterField icon={<FlagIcon sx={{ fontSize: 14 }} />} label={t("status")}>
          <MuiSelect
            fullWidth
            displayEmpty
            value={statusFilter}
            onChange={(e) => onUpdateFilters({ status: e.target.value as TranscodingStatus | "" })}
            MenuProps={menuProps}
            sx={selectSx}
          >
            <MenuItem value="">{t("allStatuses")}</MenuItem>
            <MenuItem value={TranscodingStatus.COMPLETED}>{tStatus("COMPLETED")}</MenuItem>
            <MenuItem value={TranscodingStatus.PROCESSING}>{tStatus("PROCESSING")}</MenuItem>
            <MenuItem value={TranscodingStatus.PENDING}>{tStatus("PENDING")}</MenuItem>
            <MenuItem value={TranscodingStatus.FAILED}>{tStatus("FAILED")}</MenuItem>
          </MuiSelect>
        </FilterField>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          mt: "24px",
          pt: "20px",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography sx={{ fontWeight: 700, color: "text.secondary" }}>{t("found", { count: totalCount })}</Typography>
        <Typography sx={{ fontSize: "14px", color: tokens.text.placeholder }}>{t("hint")}</Typography>
      </Box>
    </GradientCard>
  );
}
