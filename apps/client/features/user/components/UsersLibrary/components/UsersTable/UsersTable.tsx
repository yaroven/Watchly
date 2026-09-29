"use client";

import { User } from "@/features/user/schemas/user";
import { ADMIN } from "@/shared/lib/routes";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import GradientCard from "@shared/ui/GradientCard";
import UserRow from "./UserRow";

interface UsersTableProps {
  users: User[];
  loading?: boolean;
}

const HEAD_CELL_SX = {
  color: "text.secondary",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "12px",
};

const SKELETON_ROWS = Array.from({ length: 6 }, (_, index) => index);

export default function UsersTable({ users, loading }: UsersTableProps) {
  return (
    <GradientCard radius={24} sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ backgroundColor: "transparent" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={HEAD_CELL_SX}>Email</TableCell>
              <TableCell sx={HEAD_CELL_SX}>Role</TableCell>
              <TableCell sx={HEAD_CELL_SX}>Joined</TableCell>
              <TableCell sx={HEAD_CELL_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              SKELETON_ROWS.map((row) => (
                <TableRow key={row}>
                  <TableCell>
                    <Skeleton variant="text" width="60%" height={26} />
                    <Skeleton variant="text" width="30%" height={16} sx={{ mt: "4px" }} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: "999px" }} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={90} height={22} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="rounded" width={44} height={32} sx={{ borderRadius: "10px" }} />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length ? (
              users.map((user) => <UserRow key={user.id} {...user} to={ADMIN.USERS_DETAIL(user.id)} />)
            ) : (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: "center", py: "56px", border: "none" }}>
                  <Typography variant="h4" sx={{ color: "#ffffff", mb: "10px" }}>
                    No users found
                  </Typography>
                  <Typography sx={{ color: "text.secondary" }}>Try changing your search query or clearing the active filters.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </GradientCard>
  );
}
