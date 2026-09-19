import ConfirmDialog from "@/shared/ui/ConfirmDialog";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleName: string;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
}

export default function DeleteModal({ isOpen, onClose, titleName, isDeleting, onConfirm }: DeleteModalProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isPending={isDeleting}
      confirmLabel="Confirm Delete"
      pendingLabel="Deleting..."
      title="Delete Title"
      description={
        <>
          Are you sure you want to delete <strong>{titleName}</strong>? This action cannot be undone.
        </>
      }
    />
  );
}
