"use client";

import { Search as SearchIcon, Tune as TuneIcon } from "@mui/icons-material";
import Input, { InputProps } from "@mui/material/Input";
import InputAdornment from "@mui/material/InputAdornment";
import { inputVariants, tokens } from "@shared/mui/theme";
import { useTranslations } from "next-intl";

interface SearchBarProps extends Pick<InputProps, "value" | "onChange" | "onKeyDown"> {
  placeholder?: string;
}

export default function SearchBar({ placeholder, ...rest }: SearchBarProps) {
  const t = useTranslations("shared.header");
  return (
    <Input
      disableUnderline
      placeholder={placeholder ?? t("searchPlaceholder")}
      startAdornment={
        <InputAdornment position="start">
          <SearchIcon sx={{ color: tokens.text.secondary }} />
        </InputAdornment>
      }
      endAdornment={
        <InputAdornment position="end">
          <TuneIcon sx={{ fontSize: 20, color: tokens.text.field }} />
        </InputAdornment>
      }
      sx={{
        ...inputVariants.pill,
        height: 48,
        width: 320,
        borderRadius: "16px",
        backgroundColor: "#141414",
        border: `1px solid ${tokens.border.subtle}`,
        gap: "10px",
      }}
      {...rest}
    />
  );
}
