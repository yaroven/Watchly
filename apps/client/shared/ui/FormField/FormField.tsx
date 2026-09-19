import Box from "@mui/material/Box";
import Input, { InputProps as MuiInputProps } from "@mui/material/Input";
import Typography from "@mui/material/Typography";
import { inputVariants, tokens, type InputVariant } from "@shared/mui/theme";
import type { ReactNode } from "react";
import { FieldError, FieldValues, Path, UseFormRegister } from "react-hook-form";

// `error` and `name` are re-typed below, so they have to be dropped from the
// MUI props first — intersecting them would produce `boolean & FieldError`.
type InputProps<T extends FieldValues> = Omit<MuiInputProps, "error" | "name"> & {
  type?: string;
  label?: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error: FieldError | undefined;
  valueAsNumber?: boolean;
  variant?: InputVariant;
  as?: "input" | "select" | "textarea";
  children?: ReactNode;
};

export default function FormField<T extends FieldValues>({
  id,
  label,
  placeholder,
  name,
  register,
  error,
  valueAsNumber,
  variant = "pill",
  as = "input",
  children,
  sx,
  ...rest
}: InputProps<T>) {
  const fieldId = id ?? String(name).replace(/\./g, "-");
  const errorId = error ? `${fieldId}-error` : undefined;

  // InputBase renders `inputComponent`, not its own children — the <option>
  // elements have to travel through inputProps to land inside the <select>.
  const selectProps =
    as === "select"
      ? {
          inputComponent: "select" as unknown as MuiInputProps["inputComponent"],
          inputProps: { children },
        }
      : null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <Typography component="label" htmlFor={fieldId} sx={{ fontSize: "14px", fontWeight: 400, color: tokens.text.secondary }}>
          {label}
        </Typography>
      )}
      <Input
        id={fieldId}
        placeholder={placeholder}
        error={Boolean(error)}
        aria-describedby={errorId}
        multiline={as === "textarea"}
        // Both variants draw their own frame. Set here rather than only in the
        // theme, so the field looks right even outside MuiThemeProvider.
        disableUnderline
        sx={[
          inputVariants[variant],
          // A textarea has to grow, so the fixed height is dropped for it.
          as === "textarea" && { height: "auto", paddingBlock: "10px" },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...selectProps}
        {...rest}
        {...register(name, { valueAsNumber })}
      />
      {error && (
        <Typography id={errorId} role="alert" sx={{ fontSize: "12px", fontWeight: 400, color: tokens.feedback.error }}>
          {error.message}
        </Typography>
      )}
    </Box>
  );
}
