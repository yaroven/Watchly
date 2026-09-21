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
import { tokens } from "@shared/mui/theme";
import ConfirmDialog from "@shared/ui/ConfirmDialog";
import Link from "next/link";
import { Fragment, useState } from "react";
import TitleIdentity from "./components/TitleIdentity";
import TitleStatusBadge from "./components/TitleStatusBadge";

interface TitleProps extends Title {
  to: string;
}

export default function Title({ id, createdAt, name, posterUrl = "/cat.webp", transcodingStatus, type, to }: TitleProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { mutate: deleteTitle, isPending: isDeleting } = useDeleteTitle({ onSuccess: () => setIsDeleteOpen(false) });

  const createdYear = new Date(createdAt).getFullYear();
  const typeLabel = type === "MOVIE" ? "Movie" : "Series";

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
          <TitleIdentity name={name} posterUrl={posterUrl} to={to} type={type} />
        </TableCell>

        <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{Number.isNaN(createdYear) ? "----" : createdYear}</TableCell>

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
            <IconButton component={Link} href={to} aria-label="Open" sx={{ color: "#ffffff", borderRadius: 0 }}>
              <ArrowOutwardIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
            <IconButton aria-label="Delete" color="error" onClick={() => setIsDeleteOpen(true)} sx={{ borderRadius: 0 }}>
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
        confirmLabel="Confirm Delete"
        pendingLabel="Deleting..."
        title="Delete Title"
        description={
          <>
            Are you sure you want to delete <Typography component="strong">{name}</Typography>? This action cannot be undone.
          </>
        }
      />
    </Fragment>
  );
}
