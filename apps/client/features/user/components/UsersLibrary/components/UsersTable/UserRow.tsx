"use client";

import { User } from "@/features/user/schemas/user";
import Role from "@/types/role";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import Link from "next/link";

interface UserRowProps extends User {
  to: string;
}

export default function UserRow({ id, email, role, createdAt, to }: UserRowProps) {
  const createdLabel = new Date(createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <TableRow
      hover
      sx={{
        boxShadow: "inset 3px 0 0 0 transparent",
        transition: "background-color .15s ease-out, box-shadow .15s ease-out",
        "&:hover": { backgroundColor: "rgba(255,255,255,0.03)", boxShadow: `inset 3px 0 0 0 ${tokens.accent.primary}` },
      }}
    >
      <TableCell>
        <Typography
          component={Link}
          href={to}
          sx={{ fontSize: "1.05rem", fontWeight: 800, color: "#ffffff", textDecoration: "none", "&:hover": { color: "primary.main" } }}
        >
          {email}
        </Typography>
        <Typography sx={{ mt: "4px", fontSize: "0.76rem", color: "text.secondary", fontFamily: "monospace" }}>{id}</Typography>
      </TableCell>

      <TableCell>
        <Chip
          size="small"
          label={role === Role.ADMIN ? "Admin" : "User"}
          sx={
            role === Role.ADMIN
              ? { backgroundColor: "rgba(231,188,15,0.16)", color: "primary.main", fontWeight: 700 }
              : { backgroundColor: "rgba(255,255,255,0.08)", color: "text.secondary", fontWeight: 700 }
          }
        />
      </TableCell>

      <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{createdLabel}</TableCell>

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
        </Box>
      </TableCell>
    </TableRow>
  );
}
