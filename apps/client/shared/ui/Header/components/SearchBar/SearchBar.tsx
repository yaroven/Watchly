"use client";

import { Search as SearchIcon, Tune as TuneIcon } from "@mui/icons-material";
import Input, { InputProps } from "@mui/material/Input";
import InputAdornment from "@mui/material/InputAdornment";
import { inputVariants } from "@shared/mui/theme";

interface SearchBarProps extends Pick<InputProps, "value" | "onChange" | "onKeyDown"> {
  placeholder?: string;
}

export default function SearchBar({ placeholder = "Search the series, movies ...", ...rest }: SearchBarProps) {
  return (
    <Input
      disableUnderline
      placeholder={placeholder}
      startAdornment={
        <InputAdornment position="start">
          <SearchIcon sx={{ color: "#999999" }} />
        </InputAdornment>
      }
      endAdornment={
        <InputAdornment position="end">
          <TuneIcon sx={{ fontSize: 20, color: "#e5e5e5" }} />
        </InputAdornment>
      }
      sx={{
        ...inputVariants.pill,
        height: 48,
        width: 320,
        borderRadius: "16px",
        backgroundColor: "#141414",
        border: "1px solid #333333",
        gap: "10px",
      }}
      {...rest}
    />
  );
}
