"use client";

import ConfirmDialog from "@/shared/ui/ConfirmDialog";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isDeleting: boolean;
  onConfirm: () => void;
}

export default function DeleteModal({ isOpen, onClose, title, isDeleting, onConfirm }: DeleteModalProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isPending={isDeleting}
      title="Delete Season"
      description={
        <>
          Are you sure you want to delete <strong>{title}</strong>? This action cannot be undone. All episodes in this season will also be
          deleted.
        </>
      }
    />
  );
}
