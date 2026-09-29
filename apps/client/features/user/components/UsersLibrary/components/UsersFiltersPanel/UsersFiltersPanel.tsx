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
import type { ReactNode } from "react";
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
  return (
    <Box sx={{ minWidth: 0, opacity: primary ? 1 : 0.9 }}>
      <Box component="span" sx={labelSx}>
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
  return (
    <GradientCard radius={24} sx={{ width: "100%", p: "28px" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", mb: "24px" }}>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: "12px", color: "text.secondary" }}>
          <FilterAltIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Filters</Typography>
        </Box>

        {hasActiveFilters && (
          <Button variant="outlined" size="small" onClick={onResetFilters} startIcon={<ReplayIcon sx={{ fontSize: 16 }} />}>
            Reset Filters
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
        <FilterField icon={<SearchIcon sx={{ fontSize: 14 }} />} label="Search" primary>
          <TextField
            variant="standard"
            placeholder="Search by email..."
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

        <FilterField icon={<ShieldIcon sx={{ fontSize: 14 }} />} label="Role">
          <MuiSelect
            fullWidth
            displayEmpty
            value={roleFilter}
            onChange={(e) => onUpdateFilters({ role: e.target.value as Role | "" })}
            MenuProps={menuProps}
            sx={selectSx}
          >
            <MenuItem value="">All Roles</MenuItem>
            <MenuItem value={Role.ADMIN}>Admin</MenuItem>
            <MenuItem value={Role.USER}>User</MenuItem>
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
        <Typography sx={{ fontWeight: 700, color: "text.secondary" }}>Found users number: {totalCount}</Typography>
        <Typography sx={{ fontSize: "14px", color: tokens.text.placeholder }}>
          Refine the list to quickly find the account you need.
        </Typography>
      </Box>
    </GradientCard>
  );
}
