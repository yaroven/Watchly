"use client";

import { TitleFormValues } from "@/features/title/schemas/title";
import FormField from "@/shared/ui/FormField";
import Box from "@mui/material/Box";
import type { UseFormReturn } from "react-hook-form";

interface IdentityFieldsProps {
  form: UseFormReturn<TitleFormValues>;
  columns: 1 | 2;
}

export default function IdentityFields({ form, columns }: IdentityFieldsProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${columns}, minmax(0, 1fr))` }, gap: "18px" }}>
      <Box sx={{ gridColumn: "1 / -1" }}>
        <FormField label="Name" placeholder="Name" name="name" register={register} error={errors.name} />
      </Box>

      <Box sx={{ gridColumn: "1 / -1" }}>
        <FormField
          as="textarea"
          minRows={3}
          label="Description"
          placeholder="What the title is about"
          name="description"
          register={register}
          error={errors.description}
        />
      </Box>

      <FormField label="Director" placeholder="Director" name="director" register={register} error={errors.director} />
      <FormField
        label="Network"
        placeholder="Broadcast network or streaming platform"
        name="network"
        register={register}
        error={errors.network}
      />
    </Box>
  );
}
