"use client";

import { Artist, ArtistFormSchema, ArtistFormValues } from "@/features/artist/schemas/artist";
import ProgressBar from "@/features/transcoding/components/ProgressBar";
import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import { useEffect } from "react";
import { Resolver, useForm, useWatch } from "react-hook-form";
import { useArtistSubmissionWorkflow } from "./useArtistSubmissionWorkflow";

interface ArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  artist?: Artist;
}

export default function ArtistModal({ isOpen, onClose, artist }: ArtistModalProps) {
  const isEditing = !!artist;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    setValue,
  } = useForm<ArtistFormValues>({
    resolver: zodResolver(ArtistFormSchema) as Resolver<ArtistFormValues>,
    mode: "onBlur",
    defaultValues: { name: artist?.name ?? "" },
  });

  useEffect(() => {
    if (isOpen) reset({ name: artist?.name ?? "", photoFile: undefined });
  }, [isOpen, artist, reset]);

  const selectedPhotoFile = useWatch({ control, name: "photoFile" });
  const { submit, uploadProgress, isUploading, isPending, actionError } = useArtistSubmissionWorkflow({ initialData: artist });

  const onSubmit = async (data: ArtistFormValues) => {
    try {
      await submit(data);
      onClose();
    } catch {}
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Typography sx={{ fontSize: "24px", fontWeight: 700, color: "#ffffff" }}>{isEditing ? "Edit Actor" : "Add Actor"}</Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <FormField label="Name" placeholder="Actor name" name="name" register={register} error={errors.name} />

          <FormFileInput
            label="Photo"
            register={register}
            setValue={setValue}
            selectedFile={selectedPhotoFile}
            name="photoFile"
            accept="image/*"
            hint="Any image format"
            disabled={isPending}
            error={errors.photoFile}
            id="artist-photo-file"
          />

          {isUploading && <ProgressBar progress={uploadProgress} />}
          {actionError && <Alert severity="error">Error: {actionError.message}</Alert>}

          <Button disabled={isPending || (!isDirty && !isEditing)} type="submit">
            {isPending ? (isUploading ? "Uploading Photo..." : "Saving Actor...") : isEditing ? "Save Changes" : "Add Actor"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
