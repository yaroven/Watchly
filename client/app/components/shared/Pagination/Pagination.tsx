import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Pagination.module.scss";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className={styles.pagination}>
      <button
        className={styles.arrowButton}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft size={20} />
      </button>

      <div className={styles.pageNumbers}>
        {pageNumbers.map((num) => (
          <button
            key={num}
            className={currentPage === num ? styles.activePage : styles.pageButton}
            onClick={() => onPageChange(num)}
          >
            {num}
          </button>
        ))}
      </div>

      <button
        className={styles.arrowButton}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
