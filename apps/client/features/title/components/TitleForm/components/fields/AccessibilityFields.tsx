"use client";

import { TitleFormValues } from "@/features/title/schemas/title";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

interface AccessibilityFieldsProps {
  form: UseFormReturn<TitleFormValues>;
}

export default function AccessibilityFields({ form }: AccessibilityFieldsProps) {
  return (
    <Controller
      name="closedCaption"
      control={form.control}
      render={({ field }) => (
        <FormControlLabel
          control={<Checkbox {...field} checked={field.value ?? false} size="small" sx={{ color: "text.secondary" }} />}
          label="Closed captions available"
        />
      )}
    />
  );
}
