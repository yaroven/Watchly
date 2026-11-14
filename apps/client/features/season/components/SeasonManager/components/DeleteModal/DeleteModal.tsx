"use client";

import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import { useTranslations } from "next-intl";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isDeleting: boolean;
  onConfirm: () => void;
}

export default function DeleteModal({ isOpen, onClose, title, isDeleting, onConfirm }: DeleteModalProps) {
  const t = useTranslations("season");

  return (
    <ConfirmDialog
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
