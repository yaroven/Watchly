"use client";

import type { ButtonProps as MuiButtonProps } from "@mui/material/Button";
import MuiButton from "@mui/material/Button";

type ButtonProps = Omit<MuiButtonProps, "variant" | "color"> & {
  variant?: "contained" | "outlined";
  danger?: boolean;
  isPill?: boolean;
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
