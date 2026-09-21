import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@shared/ui/Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: string) => void;
}

const arrowSx = {
  width: 36,
  height: 36,
  borderRadius: "10px",
  backgroundColor: "#333333",
  color: "#ffffff",
  transition: "background-color .15s ease-out",
  ":hover": { backgroundColor: "primary.main", color: "#000000" },
  ":disabled": { backgroundColor: "#191919", color: "#666666" },
};

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
      <IconButton
        aria-label="Previous page"
        onClick={() => onPageChange(Math.max(1, currentPage - 1).toString())}
        disabled={currentPage === 1}
        sx={arrowSx}
      >
        <ChevronLeftIcon sx={{ fontSize: 20 }} />
      </IconButton>

      <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
        {pageNumbers.map((num) => (
          <Button
            key={num}
            variant={currentPage === num ? "contained" : "outlined"}
            size="small"
            onClick={() => onPageChange(num.toString())}
            sx={{ minWidth: 36, height: 36, paddingInline: 0, borderRadius: "10px" }}
          >
            {num}
          </Button>
        ))}
      </Box>

      <IconButton
        aria-label="Next page"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1).toString())}
        disabled={currentPage === totalPages}
        sx={arrowSx}
      >
        <ChevronRightIcon sx={{ fontSize: 20 }} />
      </IconButton>
    </Box>
  );
}
