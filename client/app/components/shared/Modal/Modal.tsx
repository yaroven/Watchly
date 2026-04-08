import { X } from "lucide-react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.scss";
interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Modal({ children, isOpen, onClose, size = "md" }: ModalProps) {
  if (!isOpen) return null;
  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose}></div>
      <div className={`${styles.modal} ${styles[size]}`}>
        <div className={styles.closeButton} onClick={onClose}>
          <X />
        </div>
        {children}
      </div>
    </>,
    document.getElementById("modal-portal")!,
  );
}
