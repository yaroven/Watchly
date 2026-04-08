import { FieldError, FieldValues, Path, UseFormRegister } from "react-hook-form";
import styles from "./FormField.module.scss";

interface FormFieldProps<T extends FieldValues> {
  type?: string;
  placeholder?: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error: FieldError | undefined;
  valueAsNumber?: boolean;
  as?: "input" | "select" | "textarea";
  children?: React.ReactNode;
  disabled?: boolean;
}

export default function FormField<T extends FieldValues>({
  type = "text",
  placeholder,
  name,
  register,
  error,
  valueAsNumber,
  as: Component = "input",
  children,
  disabled,
}: FormFieldProps<T>) {
  return (
    <div className={styles.fieldWrapper}>
      <Component
        className={styles.input}
        type={Component === "input" ? type : undefined}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name, { valueAsNumber })}
      >
        {children}
      </Component>
      {error && <span className={styles.errorMessage}>{error.message}</span>}
    </div>
  );
}
