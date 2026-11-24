"use client";

import Role from "@/types/role";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import ReplayIcon from "@mui/icons-material/Replay";
import SearchIcon from "@mui/icons-material/Search";
import ShieldIcon from "@mui/icons-material/Shield";
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
import { UsersPageFilters } from "../../types";

interface UsersFiltersPanelProps {
  searchString: string;
  roleFilter: Role | "";
  totalCount: number;
  hasActiveFilters: boolean;
  onUpdateFilters: (filters: UsersPageFilters) => void;
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

export default function UsersFiltersPanel({
  searchString,
  roleFilter,
  totalCount,
  hasActiveFilters,
  onUpdateFilters,
  onResetFilters,
}: UsersFiltersPanelProps) {
  const t = useTranslations("user");

  return (
    <GradientCard radius={24} sx={{ width: "100%", p: "28px" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", mb: "24px" }}>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: "12px", color: "text.secondary" }}>
          <FilterAltIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("filters.title")}</Typography>
        </Box>

        {hasActiveFilters && (
          <Button variant="outlined" size="small" onClick={onResetFilters} startIcon={<ReplayIcon sx={{ fontSize: 16 }} />}>
            {t("filters.reset")}
          </Button>
        )}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 2.4fr) minmax(160px, 1fr)" },
          columnGap: "18px",
          rowGap: "20px",
          alignItems: "start",
        }}
      >
        <FilterField icon={<SearchIcon sx={{ fontSize: 14 }} />} label={t("filters.searchLabel")} primary>
          <TextField
            variant="standard"
            placeholder={t("filters.searchPlaceholder")}
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

        <FilterField icon={<ShieldIcon sx={{ fontSize: 14 }} />} label={t("filters.roleLabel")}>
          <MuiSelect
            fullWidth
            displayEmpty
            value={roleFilter}
            onChange={(e) => onUpdateFilters({ role: e.target.value as Role | "" })}
            MenuProps={menuProps}
            sx={selectSx}
          >
            <MenuItem value="">{t("filters.allRoles")}</MenuItem>
            <MenuItem value={Role.ADMIN}>{t(`role.${Role.ADMIN}`)}</MenuItem>
            <MenuItem value={Role.USER}>{t(`role.${Role.USER}`)}</MenuItem>
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
        <Typography sx={{ fontWeight: 700, color: "text.secondary" }}>{t("filters.found", { count: totalCount })}</Typography>
        <Typography sx={{ fontSize: "14px", color: tokens.text.placeholder }}>{t("filters.hint")}</Typography>
      </Box>
    </GradientCard>
  );
}
