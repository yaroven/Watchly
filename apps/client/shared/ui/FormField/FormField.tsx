import type { ReactNode } from "react";
import { FieldError, FieldValues, Path, UseFormRegister } from "react-hook-form";
import styles from "./FormField.module.scss";

interface FormFieldProps<T extends FieldValues> {
  type?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error: FieldError | undefined;
  valueAsNumber?: boolean;
  as?: "input" | "select" | "textarea";
  children?: ReactNode;
  disabled?: boolean;
}

export default function FormField<T extends FieldValues>({
  type = "text",
  id,
  label,
  placeholder,
  name,
  register,
  error,
  valueAsNumber,
  as: Component = "input",
  children,
  disabled,
}: FormFieldProps<T>) {
  const fieldId = id ?? String(name).replace(/\./g, "-");
  const errorId = error ? `${fieldId}-error` : undefined;
  const inputClassName = [styles.input, Component === "textarea" ? styles.textarea : "", Component === "select" ? styles.select : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.fieldWrapper}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
        </label>
      )}
      <Component
        id={fieldId}
        className={inputClassName}
        type={Component === "input" ? type : undefined}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={errorId}
        {...register(name, { valueAsNumber })}
      >
        {children}
      </Component>
      {error && (
        <span id={errorId} className={styles.errorMessage} role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}
