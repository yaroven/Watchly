import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import { useTranslations } from "next-intl";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleName: string;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
}

export default function DeleteModal({ isOpen, onClose, titleName, isDeleting, onConfirm }: DeleteModalProps) {
  const t = useTranslations("title.details.deleteModal");

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isPending={isDeleting}
      confirmLabel={t("confirm")}
      pendingLabel={t("pending")}
      title={t("title")}
      description={t.rich("description", { name: titleName, strong: (chunks) => <strong>{chunks}</strong> })}
    />
  );
}
