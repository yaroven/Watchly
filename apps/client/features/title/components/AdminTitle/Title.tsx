"use client";

import { useDeleteTitle } from "@/features/title/api/use-title-mutations";
import { type Title } from "@/features/title/schemas/title";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import DeleteIcon from "@mui/icons-material/Delete";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { INLINE_ERROR } from "@shared/api/write-errors";
import { tokens } from "@shared/mui/theme";
import ConfirmDialog from "@shared/ui/ConfirmDialog";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { Fragment, useState } from "react";
import TitleIdentity from "./components/TitleIdentity";
import TitleStatusBadge from "./components/TitleStatusBadge";

interface TitleProps extends Title {
  to: string;
}

export default function Title({ id, createdAt, name, posterUrl, transcodingStatus, type, content, to }: TitleProps) {
  const t = useTranslations("title");
  const format = useFormatter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const describeError = useApiErrorMessage();
  const {
    mutate: deleteTitle,
    isPending: isDeleting,
    error: deleteError,
    reset: resetDelete,
  } = useDeleteTitle({ meta: INLINE_ERROR, onSuccess: () => setIsDeleteOpen(false) });

  const createdDate = new Date(createdAt);
  const createdYear = Number.isNaN(createdDate.getTime()) ? "----" : format.dateTime(createdDate, { year: "numeric" });
  const typeLabel = t(`type.${type}`);

  return (
    <Fragment>
      <TableRow
        hover
        sx={{
          boxShadow: "inset 3px 0 0 0 transparent",
          transition: "background-color .15s ease-out, box-shadow .15s ease-out",
          "&:hover": { backgroundColor: "rgba(255,255,255,0.03)", boxShadow: `inset 3px 0 0 0 ${tokens.accent.primary}` },
        }}
      >
        <TableCell>
          <TitleIdentity name={name} posterUrl={posterUrl} to={to} type={type} untranslated={content.fallback} />
        </TableCell>

        <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{createdYear}</TableCell>

        <TableCell>
          <Chip size="small" label={typeLabel} />
        </TableCell>

        <TableCell>
          <TitleStatusBadge status={transcodingStatus} />
        </TableCell>

        <TableCell>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: "10px",
              border: "1px solid",
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "rgba(255,255,255,0.03)",
              overflow: "hidden",
            }}
          >
            <IconButton component={Link} href={to} aria-label={t("admin.open")} sx={{ color: tokens.text.primary, borderRadius: 0 }}>
              <ArrowOutwardIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
            <IconButton
              aria-label={t("admin.delete")}
              color="error"
              onClick={() => {
                resetDelete();
                setIsDeleteOpen(true);
              }}
              sx={{ borderRadius: 0 }}
            >
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => deleteTitle(id)}
        isPending={isDeleting}
        error={describeError(deleteError)}
        confirmLabel={t("details.deleteModal.confirm")}
        pendingLabel={t("details.deleteModal.pending")}
        title={t("details.deleteModal.title")}
        description={t.rich("details.deleteModal.description", {
          name,
          strong: (chunks) => <Typography component="strong">{chunks}</Typography>,
        })}
      />
    </Fragment>
  );
}
