import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import MuiSelect, { type SelectProps as MuiSelectProps } from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { inputVariants, type InputVariant } from "@shared/mui/theme";
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
        <Typography component="label" htmlFor={fieldId} sx={{ fontSize: "14px", fontWeight: 400, color: "#999999" }}>
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
                    backgroundColor: "#333333",
                    backgroundImage: "none",
                    border: "1px solid #666666",
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
                "& .MuiSelect-icon": { color: "#ffffff", right: "12px" },
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
        <Typography id={errorId} role="alert" sx={{ fontSize: "12px", fontWeight: 400, color: "#f64e34" }}>
          {error.message}
        </Typography>
      )}
    </Box>
  );
}

const menuItemSx = {
  fontSize: "14px",
  color: "#e5e5e5",
  "&:hover": { backgroundColor: "rgba(231,188,15,.12)" },
  "&.Mui-selected": {
    backgroundColor: "rgba(231,188,15,.16)",
    color: "#e7bc0f",
    "&:hover": { backgroundColor: "rgba(231,188,15,.22)" },
  },
} as const;
