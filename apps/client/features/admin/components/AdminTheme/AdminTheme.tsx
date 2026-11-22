"use client";

import GlobalStyles from "@mui/material/GlobalStyles";
import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";
import { tokens } from "@shared/mui/theme";
import { type ReactNode, useMemo } from "react";

interface AdminThemeProps {
  fontFamily: string;
  children: ReactNode;
}

export default function AdminTheme({ fontFamily, children }: AdminThemeProps) {
  const base = useTheme();
  const theme = useMemo(() => {
    const ui = `${fontFamily}, system-ui, sans-serif`;
    const heading = { fontFamily: ui, fontWeight: 600, letterSpacing: "-0.01em" };
    const control = { minHeight: 36, paddingBlock: 6, fontSize: "14px", fontWeight: 500, borderRadius: 8 };

    return createTheme(base, {
      typography: {
        fontFamily: ui,
        h1: { ...heading, fontWeight: 700, fontSize: "1.75rem", lineHeight: 1.2, letterSpacing: "-0.02em" },
        h2: { ...heading, fontWeight: 700, fontSize: "1.5rem", lineHeight: 1.25 },
        h3: { ...heading, fontSize: "1.25rem", lineHeight: 1.3 },
        h4: { ...heading, fontSize: "1.125rem", lineHeight: 1.35 },
        h5: { ...heading, fontSize: "1rem", lineHeight: 1.4 },
        h6: { ...heading, fontSize: "0.9375rem", lineHeight: 1.4 },
        body1: { fontSize: "0.9375rem", lineHeight: 1.55 },
        body2: { fontSize: "0.8125rem", lineHeight: 1.5, color: tokens.text.secondary },
        button: { fontWeight: 500 },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            contained: { ...control, paddingInline: 16 },
            outlined: { ...control, paddingInline: 14, borderColor: tokens.border.subtle, color: tokens.text.primary },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              minHeight: 44,
              paddingInline: 0,
              marginRight: 24,
              minWidth: 0,
              fontSize: "14px",
              fontWeight: 500,
              color: tokens.text.secondary,
              "&.Mui-selected": { color: tokens.text.primary },
            },
          },
        },
        MuiTabs: { styleOverrides: { root: { minHeight: 44 } } },
      },
    });
  }, [base, fontFamily]);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles
        styles={{
          "body[class]": {
            "--font-body": fontFamily,
            "--font-heading": fontFamily,
            "--modal-bg": tokens.surface.default,
            "--modal-border": tokens.border.subtle,
            "--modal-radius": "14px",
            "--modal-shadow": "0 24px 64px rgba(0, 0, 0, 0.55)",
            "--modal-backdrop": "rgba(0, 0, 0, 0.6)",
            "--modal-close-bg": "transparent",
            "--modal-close-hover-bg": tokens.surface.fill,
            "--modal-close-color": tokens.text.secondary,
            "--modal-focus": tokens.accent.primary,
          },
          "::selection": { backgroundColor: "rgba(231, 188, 15, 0.35)", color: tokens.text.primary },
        }}
      />
      {children}
    </ThemeProvider>
  );
}
