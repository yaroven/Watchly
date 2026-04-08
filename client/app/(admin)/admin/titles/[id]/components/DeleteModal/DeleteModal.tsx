import Modal from "@/app/components/shared/Modal";
import { AlertTriangle } from "lucide-react";
import styles from "./DeleteModal.module.scss";

interface DeleteModalProps {
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (isOpen: boolean) => void;
  title: { name: string };
  isDeleting: boolean;
  handleDelete: () => Promise<void>;
}

export default function DeleteModal({
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  title,
  isDeleting,
  handleDelete,
}: DeleteModalProps) {
  return (
    <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
      <div className={styles.modalContent}>
        <AlertTriangle className={styles.warningIcon} size={48} />
        <h3>Delete Title</h3>
        <p>
          Are you sure you want to delete <strong>{title.name}</strong>? This action cannot be
          undone.
        </p>
        <div className={styles.modalActions}>
          <button
            className={styles.modalCancelButton}
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className={styles.modalConfirmButton}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
