import { createTheme } from "@mui/material/styles";

declare module "@mui/material/Card" {
  interface CardPropsVariantOverrides {
    bordered: true;
    glass: true;
    poster: true;
  }
}

declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    bordered: true;
    glass: true;
    poster: true;
  }
}

declare module "@mui/material/styles" {
  interface BreakpointOverrides {
    xxl: true;
  }
}

const HEADING_FONT = "var(--font-heading), Arial, Helvetica, sans-serif";

export const tokens = {
  accent: { primary: "#e7bc0f" },
  border: { default: "#cccccc", subtle: "#333333", faint: "#666666" },
  feedback: { error: "#f64e34", success: "#27c237", warning: "#eb8509", info: "#275bc2" },
  text: { primary: "#ffffff", secondary: "#999999", field: "#e5e5e5", placeholder: "#666666" },
  surface: { paper: "#000000", default: "#191919", fill: "#333333", dropzone: "#111111" },
} as const;

export const tmovieTheme = createTheme({
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536, xxl: 2200 },
  },
  palette: {
    mode: "dark",
    background: {
      default: tokens.surface.default,
      paper: tokens.surface.paper,
    },
    primary: {
      main: tokens.accent.primary,
      contrastText: tokens.surface.default,
    },
    error: {
      main: tokens.feedback.error,
    },
    success: {
      main: tokens.feedback.success,
    },
    warning: {
      main: tokens.feedback.warning,
    },
    info: {
      main: tokens.feedback.info,
    },
    text: {
      primary: tokens.text.primary,
      secondary: tokens.text.secondary,
    },
    divider: tokens.border.subtle,
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "var(--font-body), Arial, Helvetica, sans-serif",
    h1: { fontFamily: HEADING_FONT, fontWeight: 700, fontSize: "clamp(26px, 2.2vw, 44px)" },
    h2: { fontFamily: HEADING_FONT, fontWeight: 700, fontSize: "clamp(20px, 1.7vw, 34px)" },
    h3: { fontFamily: HEADING_FONT, fontWeight: 600, fontSize: "clamp(18px, 1.4vw, 28px)" },
    h4: { fontFamily: HEADING_FONT, fontWeight: 600, fontSize: "clamp(16px, 1.25vw, 24px)" },
    h5: { fontFamily: HEADING_FONT, fontWeight: 500, fontSize: "clamp(15px, 1.1vw, 21px)" },
    h6: { fontFamily: HEADING_FONT, fontWeight: 500, fontSize: "clamp(14px, 1vw, 19px)" },
    body1: { fontSize: "clamp(14px, 1.1vw, 21px)", fontWeight: 400 },
    body2: { fontSize: "clamp(13px, 0.95vw, 18px)", fontWeight: 400, color: "#999999" },
    button: { textTransform: "none", fontWeight: 400 },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        contained: {
          borderRadius: 8,
          minHeight: "clamp(32px, 2.4vw, 44px)",
          paddingInline: "clamp(18px, 1.8vw, 34px)",
          paddingBlock: 10,
          fontSize: "clamp(13px, 0.95vw, 18px)",
        },
        outlined: {
          borderRadius: 8,
          minHeight: "clamp(32px, 2.4vw, 44px)",
          paddingInline: "clamp(12px, 1vw, 20px)",
          paddingBlock: 10,
          fontSize: "clamp(13px, 0.95vw, 18px)",
          borderWidth: 1,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#000000",
          backgroundImage: "none",
          borderRadius: 12,
          border: "1px solid #333333",
        },
      },
      variants: [
        {
          props: { variant: "bordered" },
          style: {
            backgroundColor: "transparent",
            borderRadius: 20,
            border: "1px solid #808080",
          },
        },
        {
          props: { variant: "glass" },
          style: {
            backgroundColor: "rgba(0,0,0,.25)",
            borderRadius: 20,
            border: "1px solid #666666",
          },
        },
        {
          props: { variant: "poster" },
          style: {
            backgroundColor: "#333333",
            borderRadius: 12,
            border: "none",
            padding: 8,
          },
        },
      ],
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          height: 36,
          backgroundColor: "#333333",
          color: "#e5e5e5",
          fontSize: "14px",
        },
      },
    },
    MuiInput: {
      defaultProps: {
        disableUnderline: true,
      },
      styleOverrides: {
        root: {
          color: tokens.text.field,
          "& input::placeholder, & textarea::placeholder": {
            color: tokens.text.placeholder,
            opacity: 1,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#e7bc0f",
          height: 2,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          color: "#999999",
          "&.Mui-selected": {
            color: "#e7bc0f",
          },
        },
      },
    },
  },
});

const fieldBase = {
  color: tokens.text.field,
  "& input::placeholder, & textarea::placeholder": { color: tokens.text.placeholder, opacity: 1 },
  "& select": { color: tokens.text.field, backgroundColor: "transparent" },
  "& select option": { backgroundColor: tokens.surface.fill, color: tokens.text.field },
} as const;

export const inputVariants = {
  bordered: {
    ...fieldBase,
    height: 48,
    borderRadius: 0,
    borderBottom: `1px solid ${tokens.border.default}`,
    paddingInline: "2px",
    fontSize: "16px",
    fontWeight: 500,
    "&.Mui-focused": { borderBottomColor: tokens.accent.primary },
    "&.Mui-error": { borderBottomColor: tokens.feedback.error },
  },
  pill: {
    ...fieldBase,
    height: 36,
    borderRadius: "24px",
    backgroundColor: tokens.surface.fill,
    paddingInline: "18px",
    fontSize: "14px",
    fontWeight: 400,
    "&.Mui-focused": { outline: `1px solid ${tokens.accent.primary}` },
    "&.Mui-error": { outline: `1px solid ${tokens.feedback.error}` },
  },
} as const;

export type InputVariant = keyof typeof inputVariants;
