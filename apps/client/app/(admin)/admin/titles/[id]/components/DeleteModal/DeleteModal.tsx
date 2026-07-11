import Modal from "@/shared/ui/Modal";
import { AlertTriangle } from "lucide-react";
import styles from "./DeleteModal.module.scss";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleName: string;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
}

export default function DeleteModal({ isOpen, onClose, titleName, isDeleting, onConfirm }: DeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContent}>
        <AlertTriangle className={styles.warningIcon} size={48} />
        <h3>Delete Title</h3>
        <p>
          Are you sure you want to delete <strong>{titleName}</strong>? This action cannot be undone.
        </p>
        <div className={styles.modalActions}>
          <button type="button" className={styles.modalCancelButton} onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className={styles.modalConfirmButton} onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
