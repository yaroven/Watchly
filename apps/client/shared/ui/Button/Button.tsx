"use client";

import type { ButtonProps as MuiButtonProps } from "@mui/material/Button";
import MuiButton from "@mui/material/Button";

type ButtonProps = Omit<MuiButtonProps, "variant" | "color"> & {
  variant?: "contained" | "outlined";
  danger?: boolean;
};

export default function Button({ variant = "contained", danger = false, children, ...rest }: ButtonProps) {
  return (
    <MuiButton color={danger ? "error" : "primary"} variant={variant} {...rest}>
      {children}
    </MuiButton>
  );
}
