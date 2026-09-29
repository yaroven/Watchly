"use client";

import AgeRatingPicker from "@/features/title/components/TitleForm/components/AgeRatingPicker";
import GenrePicker from "@/features/title/components/TitleForm/components/GenrePicker";
import TypeSelector from "@/features/title/components/TitleForm/components/TypeSelector";
import { TitleFormValues, TitleType } from "@/features/title/schemas/title";
import FormField from "@/shared/ui/FormField";
import Box from "@mui/material/Box";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

interface ClassificationFieldsProps {
  form: UseFormReturn<TitleFormValues>;
  columns: 1 | 2;
  /** Type is fixed once a title exists — seasons and video already hang off it. */
  isEditing: boolean;
  selectedType?: TitleType;
}

export default function ClassificationFields({ form, columns, isEditing, selectedType }: ClassificationFieldsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <Controller
        name="type"
        control={control}
        render={({ field }) => <TypeSelector value={field.value} onChange={field.onChange} disabled={isEditing} />}
      />

      <Controller
        name="ageRating"
        control={control}
        render={({ field }) => <AgeRatingPicker value={field.value} onChange={field.onChange} error={errors.ageRating?.message} />}
      />

      <Controller
        name="genreIds"
        control={control}
        render={({ field }) => <GenrePicker value={field.value ?? []} onChange={field.onChange} />}
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${columns}, minmax(0, 1fr))` }, gap: "18px" }}>
        <FormField label="Country" placeholder="Country of origin" name="country" register={register} error={errors.country} />
        <FormField label="Language" placeholder="Language" name="language" register={register} error={errors.language} />
        <FormField type="date" label="Release Date" name="releaseDate" register={register} error={errors.releaseDate} />
        <FormField
          type="number"
          valueAsNumber
          label={selectedType === TitleType.SERIES ? "Runtime (minutes) — set per episode" : "Runtime (minutes)"}
          placeholder="Runtime in minutes"
          name="runtime"
          register={register}
          error={errors.runtime}
        />
      </Box>
    </Box>
  );
}
