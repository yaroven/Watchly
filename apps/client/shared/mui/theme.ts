import { createTheme } from "@mui/material/styles";

declare module "@mui/material/Card" {
  interface CardPropsVariantOverrides {
    bordered: true;
    glass: true;
    poster: true;
  }
}

// Card resolves its `variant` through Paper, so the union has to be widened there too.
declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    bordered: true;
    glass: true;
    poster: true;
  }
}

/**
 * design tokens, read directly off the Penpot source file
 * (see the component handoff doc). Font stays PT Sans to match the
 * app's real typography instead of the Figma mockup's Poppins.
 */
declare module "@mui/material/styles" {
  interface BreakpointOverrides {
    xxl: true;
  }
}

const HEADING_FONT = "var(--font-heading), Arial, Helvetica, sans-serif";

export const tmovieTheme = createTheme({
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536, xxl: 2200 },
  },
  palette: {
    mode: "dark",
    background: {
      default: "#191919",
      paper: "#000000",
    },
    primary: {
      main: "#e7bc0f",
      contrastText: "#191919",
    },
    error: {
      main: "#f64e34",
    },
    success: {
      main: "#27c237",
    },
    warning: {
      main: "#eb8509",
    },
    info: {
      main: "#275bc2",
    },
    text: {
      primary: "#ffffff",
      secondary: "#999999",
    },
    divider: "#333333",
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    // Poppins carries the body copy; Fredoka is scoped to headings only.
    fontFamily: "var(--font-body), Arial, Helvetica, sans-serif",
    // Sizes clamp between a small-screen floor and a wide-screen ceiling, with
    // the middle value tracking viewport width. The design's 1440 numbers sit
    // roughly in the middle of each range.
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
        // Contained = "Submit Btn" / "Play Button": r5, gold fill, black label
        contained: {
          borderRadius: 5,
          minHeight: "clamp(40px, 3vw, 56px)",
          paddingInline: "clamp(18px, 1.8vw, 34px)",
          paddingBlock: 10,
          fontSize: "clamp(14px, 1.1vw, 21px)",
        },
        // Outlined = "Trailer Button" / "Load More": r8, 1px gold border, gold label
        outlined: {
          borderRadius: 8,
          minHeight: "clamp(32px, 2.4vw, 44px)",
          paddingInline: "clamp(12px, 1vw, 20px)",
          paddingBlock: 8,
          fontSize: "clamp(13px, 0.95vw, 18px)",
          borderWidth: 1,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        // Solid — the dominant container in the template
        root: {
          backgroundColor: "#000000",
          backgroundImage: "none",
          borderRadius: 12,
          border: "1px solid #333333",
        },
      },
      variants: [
        {
          // "David Jones" review card — Film page
          props: { variant: "bordered" },
          style: {
            backgroundColor: "transparent",
            borderRadius: 20,
            border: "1px solid #808080",
          },
        },
        {
          // Login Form panel, sitting over the poster art
          props: { variant: "glass" },
          style: {
            backgroundColor: "rgba(0,0,0,.25)",
            borderRadius: 20,
            border: "1px solid #666666",
          },
        },
        {
          // "Film Card ( Style 1 )" — frame around a poster
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
        // "Selector" filter pill from the Search Result page
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
        // Both field variants draw their own frame, so MUI's underline is off.
        disableUnderline: true,
      },
      styleOverrides: {
        root: {
          color: "#e5e5e5",
          "& input::placeholder, & textarea::placeholder": {
            color: "#666666",
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

/**
 * Field variants from the design file. MUI's Input has no native `variant`
 * prop, so these are applied through `sx` rather than `theme.components`.
 */
const fieldBase = {
  color: "#e5e5e5",
  "& input::placeholder, & textarea::placeholder": { color: "#666666", opacity: 1 },
  // Native <select> renders its popup with the OS palette unless told otherwise.
  "& select": { color: "#e5e5e5", backgroundColor: "transparent" },
  "& select option": { backgroundColor: "#333333", color: "#e5e5e5" },
} as const;

export const inputVariants = {
  // Login Form field: 466×48, square, 1px #cccccc frame, 20px/500 text
  bordered: {
    ...fieldBase,
    height: 48,
    borderRadius: 0,
    border: "1px solid #cccccc",
    paddingInline: "14px",
    fontSize: "20px",
    fontWeight: 500,
    "&.Mui-error": { borderColor: "#f64e34" },
  },
  // Admin form field: h36, r24, #333333 fill, 14px/400 text
  pill: {
    ...fieldBase,
    height: 36,
    borderRadius: "24px",
    backgroundColor: "#333333",
    paddingInline: "18px",
    fontSize: "14px",
    fontWeight: 400,
    "&.Mui-error": { outline: "1px solid #f64e34" },
  },
} as const;

export type InputVariant = keyof typeof inputVariants;
