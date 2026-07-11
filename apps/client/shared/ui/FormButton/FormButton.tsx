import styles from "./FormButton.module.scss";

interface FormButtonProps {
  disabled: boolean;
  type: "button" | "submit" | "reset";
  children?: React.ReactNode;
}

export default function FormButton({ disabled, type, children }: FormButtonProps) {
  return (
    <button className={styles.formButton} disabled={disabled} type={type}>
      {children}
    </button>
  );
}
