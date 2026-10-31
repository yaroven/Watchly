import Box from "@mui/material/Box";
import Input, { InputProps as MuiInputProps } from "@mui/material/Input";
import Typography from "@mui/material/Typography";
import { inputVariants, tokens, type InputVariant } from "@shared/mui/theme";
import type { ReactNode } from "react";
import { FieldError, FieldValues, Path, UseFormRegister } from "react-hook-form";

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
        disableUnderline
        sx={[inputVariants[variant], as === "textarea" && { height: "auto", paddingBlock: "10px" }, ...(Array.isArray(sx) ? sx : [sx])]}
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
