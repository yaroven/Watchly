"use client";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import { ChangeEvent, useEffect, useMemo, useRef } from "react";
import { FieldError, FieldValues, Path, PathValue, UseFormRegister, UseFormSetValue } from "react-hook-form";
import FilePreviewCard from "./components/FilePreviewCard";
import UploadDropzone from "./components/UploadDropzone";

interface FormFileInputProps<T extends FieldValues> {
  name: Path<T>;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  selectedFile?: FileList;
  label?: string;
  error: FieldError | undefined;
  valueAsNumber?: boolean;
  accept?: string;
  onFileSelect?: (file: File | null) => void;
  id?: string;
  hint?: string;
  disabled?: boolean;
}

export default function FormFileInput<T extends FieldValues>({
  accept = "*",
  onFileSelect,
  id = "file-input",
  register,
  setValue,
  selectedFile,
  label,
  name,
  error,
  valueAsNumber,
  hint,
  disabled = false,
}: FormFileInputProps<T>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const file = selectedFile?.[0] ?? null;
  const fileName = file?.name ?? "";
  const isVideo = file?.type.startsWith("video/") ?? false;
  const isImage = file?.type.startsWith("image/") ?? false;

  const { ref, onChange, ...rest } = register(name, { valueAsNumber });
  const fileUrl = useMemo(() => {
    if (!file) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!file && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [file]);

  const errorId = error ? `${id}-error` : undefined;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange(e);
    const selected = e.target.files?.[0];

    if (selected) {
      if (onFileSelect) onFileSelect(selected);
    }
  };

  const handleRemove = (): void => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onFileSelect) onFileSelect(null);
    setValue(name, undefined as PathValue<T, Path<T>>, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <Typography component="label" htmlFor={id} sx={{ fontSize: "14px", fontWeight: 400, color: tokens.text.secondary }}>
          {label}
        </Typography>
      )}

      <Box
        component="input"
        {...rest}
        type="file"
        id={id}
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={errorId}
        sx={{ display: "none" }}
        ref={(e: HTMLInputElement) => {
          ref(e);
          fileInputRef.current = e;
        }}
      />

      {!fileUrl ? (
        <UploadDropzone inputId={id} hint={hint} hasError={Boolean(error)} disabled={disabled} />
      ) : (
        <FilePreviewCard
          inputId={id}
          fileUrl={fileUrl}
          fileName={fileName}
          isVideo={isVideo}
          isImage={isImage}
          onRemove={handleRemove}
          hasError={Boolean(error)}
          disabled={disabled}
        />
      )}

      {error && (
        <Typography id={errorId} role="alert" sx={{ fontSize: "12px", color: tokens.feedback.error }}>
          {error.message || "Invalid file"}
        </Typography>
      )}
    </Box>
  );
}
