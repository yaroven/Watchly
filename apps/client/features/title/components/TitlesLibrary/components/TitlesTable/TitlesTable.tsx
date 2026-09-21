"use client";

import AdminTitle from "@/features/title/components/AdminTitle";
import { Title } from "@/features/title/schemas/title";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import GradientCard from "@shared/ui/GradientCard";

interface TitlesTableProps {
  titles: Title[];
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

export default function TitlesTable({ titles, loading }: TitlesTableProps) {
  return (
    <GradientCard radius={24} sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ backgroundColor: "transparent" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={HEAD_CELL_SX}>Title</TableCell>
              <TableCell sx={HEAD_CELL_SX}>Year</TableCell>
              <TableCell sx={HEAD_CELL_SX}>Type</TableCell>
              <TableCell sx={HEAD_CELL_SX}>Status</TableCell>
              <TableCell sx={HEAD_CELL_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              SKELETON_ROWS.map((row) => (
                <TableRow key={row}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "18px" }}>
                      <Skeleton variant="rounded" width={56} height={80} sx={{ borderRadius: "10px", flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Skeleton variant="text" width="70%" height={26} />
                        <Skeleton variant="text" width="40%" height={18} sx={{ mt: "6px" }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={40} height={22} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: "999px" }} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: "999px" }} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="rounded" width={72} height={32} sx={{ borderRadius: "10px" }} />
                  </TableCell>
                </TableRow>
              ))
            ) : titles.length ? (
              titles.map((title) => <AdminTitle key={title.id} {...title} to={`/admin/titles/${title.id}`} />)
            ) : (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: "center", py: "56px", border: "none" }}>
                  <Typography variant="h4" sx={{ color: "#ffffff", mb: "10px" }}>
                    No titles found
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
