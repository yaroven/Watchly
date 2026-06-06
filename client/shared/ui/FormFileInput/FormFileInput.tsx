"use client";
import { Edit, FileText, Trash, UploadCloud } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef } from "react";
import {
  FieldError,
  FieldValues,
  Path,
  PathValue,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import styles from "./FormFileInput.module.scss";

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
    <div className={styles.uploadContainer}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={`${styles.uploadWrapper} ${error ? styles.errorState : ""}`}>
        <input
          {...rest}
          type="file"
          id={id}
          accept={accept}
          onChange={handleFileChange}
          className={styles.hiddenInput}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={errorId}
          ref={(e) => {
            ref(e);
            fileInputRef.current = e;
          }}
        />

        {!fileUrl ? (
          <label htmlFor={id} className={styles.uploadPlaceholder}>
            <UploadCloud size={20} className={error ? styles.errorIcon : ""} />
            <span>Upload File</span>
          </label>
        ) : (
          <div className={styles.fileRowCard}>
            <div className={styles.videoSide}>
              {isVideo ? (
                <video src={fileUrl} />
              ) : isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl ?? undefined} alt={fileName || "Selected file preview"} />
              ) : (
                <div className={styles.fileIconPlaceholder}>
                  <FileText size={32} color="#64748b" />
                </div>
              )}
            </div>

            <div className={styles.infoSide}>
              <span className={styles.fileName} title={fileName}>
                {fileName}
              </span>
              <div className={styles.actionRow}>
                <label htmlFor={id} className={styles.changeBtn}>
                  <Edit size={18} />
                </label>
                <button type="button" onClick={handleRemove} className={styles.removeBtn}>
                  <Trash size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {error && (
        <span id={errorId} className={styles.errorMessage} role="alert">
          {error.message || "Invalid file"}
        </span>
      )}
    </div>
  );
}
