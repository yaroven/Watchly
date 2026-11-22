"use client";

import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import { useTranslations } from "next-intl";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isDeleting: boolean;
  error?: string | null;
  onConfirm: () => void;
}

export default function DeleteModal({ isOpen, onClose, title, isDeleting, onConfirm, error }: DeleteModalProps) {
  const t = useTranslations("season");

  return (
    <ConfirmDialog
      error={error}
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isPending={isDeleting}
      confirmLabel={t("delete.confirm")}
      pendingLabel={t("delete.pending")}
      title={t("delete.title")}
      description={t.rich("delete.description", {
        title,
        strong: (chunks) => <strong>{chunks}</strong>,
      })}
    />
  );
}
