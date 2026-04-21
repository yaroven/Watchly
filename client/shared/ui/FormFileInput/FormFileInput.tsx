"use client";
import { Edit, FileText, Trash, UploadCloud } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { FieldError, FieldValues, Path, UseFormRegister } from "react-hook-form";
import styles from "./FormFileInput.module.scss";

interface FormFileInputProps<T extends FieldValues> {
  name: Path<T>;
  register: UseFormRegister<T>;
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
  name,
  error,
  valueAsNumber,
}: FormFileInputProps<T>) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isVideo, setIsVideo] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { ref, onChange, ...rest } = register(name, { valueAsNumber });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange(e);
    const file = e.target.files?.[0];

    if (file) {
      const isVid = file.type.startsWith("video/");
      setIsVideo(isVid);
      setFileName(file.name);
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      if (onFileSelect) onFileSelect(file);
    }
  };

  const handleRemove = (): void => {
    setFileUrl(null);
    setFileName("");
    setIsVideo(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onFileSelect) onFileSelect(null);

    const dummyEvent = {
      target: { name, value: null },
    };
    onChange(dummyEvent);
  };

  return (
    <div className={styles.uploadContainer}>
      <div className={`${styles.uploadWrapper} ${error ? styles.errorState : ""}`}>
        <input
          {...rest}
          type="file"
          id={id}
          accept={accept}
          onChange={handleFileChange}
          className={styles.hiddenInput}
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
      {error && <span className={styles.errorMessage}>{error.message || "Invalid file"}</span>}
    </div>
  );
}
