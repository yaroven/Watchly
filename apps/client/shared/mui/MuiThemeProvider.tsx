"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { tmovieTheme } from "./theme";

export default function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={tmovieTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
