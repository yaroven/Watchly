import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import MuiSelect, { type SelectProps as MuiSelectProps } from "@mui/material/Select";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { inputVariants, tokens, type InputVariant } from "@shared/mui/theme";
import { Controller, type Control, type FieldError, type FieldValues, type Path } from "react-hook-form";

export interface SelectOption {
  value: string;
  label: string;
}

// `error` and `name` are re-typed below, so they are dropped from the MUI props
// first — intersecting them would produce `boolean & FieldError`.
type SelectFieldProps<T extends FieldValues> = Omit<MuiSelectProps, "error" | "name" | "variant"> & {
  label?: string;
  name: Path<T>;
  control: Control<T>;
  error: FieldError | undefined;
  options: SelectOption[];
  placeholder?: string;
  variant?: InputVariant;
};

/**
 * Dropdown with the app's own menu, rather than the browser's native one.
 * MUI renders the list as a styled popover, so `<option>` limitations
 * (no theming, OS palette) don't apply.
 */
export default function Select<T extends FieldValues>({
  id,
  label,
  name,
  control,
  error,
  options,
  placeholder = "Select",
  variant = "pill",
  sx,
  ...rest
}: SelectFieldProps<T>) {
  const fieldId = id ?? String(name).replace(/\./g, "-");
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <Typography component="label" htmlFor={fieldId} sx={{ fontSize: "14px", fontWeight: 400, color: tokens.text.secondary }}>
          {label}
        </Typography>
      )}

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <MuiSelect
            {...field}
            id={fieldId}
            value={field.value ?? ""}
            displayEmpty
            disableUnderline
            variant="standard"
            error={Boolean(error)}
            aria-describedby={errorId}
            MenuProps={{
              slotProps: {
                paper: {
                  sx: {
                    mt: "4px",
                    borderRadius: "12px",
                    backgroundColor: tokens.surface.fill,
                    backgroundImage: "none",
                    border: `1px solid ${tokens.border.faint}`,
                  },
                },
              },
            }}
            sx={[
              inputVariants[variant],
              {
                display: "flex",
                alignItems: "center",
                "& .MuiSelect-select": {
                  padding: 0,
                  minHeight: "unset",
                  display: "flex",
                  alignItems: "center",
                  "&:focus": { backgroundColor: "transparent" },
                },
                "& .MuiSelect-icon": { color: tokens.text.primary, right: "12px" },
              },
              ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...rest}
          >
            <MenuItem value="" disabled sx={menuItemSx}>
              {placeholder}
            </MenuItem>
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={menuItemSx}>
                {option.label}
              </MenuItem>
            ))}
          </MuiSelect>
        )}
      />

      {error && (
        <Typography id={errorId} role="alert" sx={{ fontSize: "12px", fontWeight: 400, color: tokens.feedback.error }}>
          {error.message}
        </Typography>
      )}
    </Box>
  );
}

const menuItemSx = {
  fontSize: "14px",
  color: tokens.text.field,
  "&:hover": { backgroundColor: alpha(tokens.accent.primary, 0.12) },
  "&.Mui-selected": {
    backgroundColor: alpha(tokens.accent.primary, 0.16),
    color: tokens.accent.primary,
    "&:hover": { backgroundColor: alpha(tokens.accent.primary, 0.22) },
  },
} as const;
