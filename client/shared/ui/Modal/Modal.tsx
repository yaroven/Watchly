"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.scss";

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Modal({ children, isOpen, onClose, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const portalRoot = document.getElementById("modal-portal");
  if (!portalRoot) return null;

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.dialog} role="dialog" aria-modal="true" onClick={onClose}>
        <div
          className={`${styles.modal} ${styles[size]}`}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X />
          </button>
          {children}
        </div>
      </div>
    </>,
    portalRoot,
  );
}
