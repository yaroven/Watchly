"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { tmovieTheme } from "./theme";

/**
 * Scoped MUI provider for pages/components that opt into MUI instead
 * of the app's default SCSS-module styling. Not wired into the root
 * layout on purpose — see shared/mui/README.md.
 */
export default function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={tmovieTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
