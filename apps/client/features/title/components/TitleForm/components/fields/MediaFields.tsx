"use client";

import { TitleFormValues } from "@/features/title/schemas/title";
import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { tokens } from "@shared/mui/theme";
import { Activity } from "react";
import type { UseFormReturn } from "react-hook-form";

interface MediaFieldsProps {
  form: UseFormReturn<TitleFormValues>;
  /** Movies carry their own file; series get theirs per episode. */
  showVideoField: boolean;
  disabled: boolean;
}

export default function MediaFields({ form, showVideoField, disabled }: MediaFieldsProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <FormFileInput
        label="Poster"
        register={register}
        setValue={setValue}
        selectedFile={watch("posterFile")}
        name="posterFile"
        accept="image/*"
        hint="Any image format"
        disabled={disabled}
        error={errors.posterFile}
        id="title-poster-file"
      />

      <FormField type="url" label="Trailer URL" placeholder="https://..." name="trailerUrl" register={register} error={errors.trailerUrl} />

      <Activity mode={showVideoField ? "visible" : "hidden"}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <FormFileInput
            label="Video File"
            register={register}
            setValue={setValue}
            selectedFile={watch("videoFile")}
            name="videoFile"
            accept="video/*"
            hint="Any video format"
            disabled={disabled}
            error={errors.videoFile}
            id="title-video-file"
          />

          <Box
            sx={{
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
              p: "12px 14px",
              borderRadius: "10px",
              backgroundColor: alpha(tokens.feedback.info, 0.1),
              border: `1px solid ${alpha(tokens.feedback.info, 0.45)}`,
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 16, color: "#7aa2f7", flexShrink: 0, mt: "1px" }} />
            <Typography sx={{ fontSize: "12px", lineHeight: 1.5, color: "#b9c6e3" }}>
              Large files upload in parts and survive a dropped connection. Transcoding starts on its own once the upload lands.
            </Typography>
          </Box>
        </Box>
      </Activity>
    </Box>
  );
}
