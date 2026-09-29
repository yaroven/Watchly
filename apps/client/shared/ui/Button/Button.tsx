"use client";

import type { ButtonProps as MuiButtonProps } from "@mui/material/Button";
import MuiButton from "@mui/material/Button";

type ButtonProps = Omit<MuiButtonProps, "variant" | "color"> & {
  variant?: "contained" | "outlined";
  danger?: boolean;
  isPill?: boolean;
  // MUI renders an `<a>` when `href` is passed, but `ButtonProps`'s default
  // "button" component typing doesn't carry anchor-only attributes.
  target?: string;
  rel?: string;
};

const PILL_SX = {
  borderRadius: "999px",
};

export default function Button({ variant = "contained", danger = false, isPill, sx, children, ...rest }: ButtonProps) {
  return (
    <MuiButton
      color={danger ? "error" : "primary"}
      variant={variant}
      sx={isPill ? [PILL_SX, ...(Array.isArray(sx) ? sx : [sx])] : sx}
      {...rest}
    >
      {children}
    </MuiButton>
  );
}
