"use client";

import { TitleType } from "@/features/title/schemas/title";
import TranscodingStatus from "@/types/transcoding-status";
import { Filter, RotateCcw, Search } from "lucide-react";
import styles from "../page.module.scss";
import { TitlesPageFilters } from "./types";

interface TitlesFiltersPanelProps {
  searchString: string;
  typeFilter: TitleType | "";
  statusFilter: TranscodingStatus | "";
  totalCount: number;
  hasActiveFilters: boolean;
  onUpdateFilters: (filters: TitlesPageFilters) => void;
  onResetFilters: () => void;
}

export default function TitlesFiltersPanel({
  searchString,
  typeFilter,
  statusFilter,
  totalCount,
  hasActiveFilters,
  onUpdateFilters,
  onResetFilters,
}: TitlesFiltersPanelProps) {
  return (
    <section className={styles.filterCard}>
      <div className={styles.filterHeader}>
        <div className={styles.filterTitle}>
          <Filter size={20} />
          <span>Filters</span>
        </div>

        {hasActiveFilters && (
          <button className={styles.resetButton} onClick={onResetFilters}>
            <RotateCcw size={16} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <label className={styles.searchField}>
          <Search size={22} />
          <input
            type="text"
            placeholder="Search by title..."
            className={styles.searchInput}
            value={searchString}
            onChange={(e) => onUpdateFilters({ search: e.target.value })}
          />
        </label>

        <select
          className={styles.typeSelect}
          value={typeFilter}
          onChange={(e) => onUpdateFilters({ type: e.target.value as TitleType | "" })}
        >
          <option value="">All Types</option>
          <option value={TitleType.MOVIE}>Movies</option>
          <option value={TitleType.SERIES}>Series</option>
        </select>

        <select className={styles.typeSelect} value="" disabled>
          <option value="">All Genres</option>
        </select>

        <select
          className={styles.typeSelect}
          value={statusFilter}
          onChange={(e) => onUpdateFilters({ status: e.target.value as TranscodingStatus | "" })}
        >
          <option value="">All Statuses</option>
          <option value={TranscodingStatus.COMPLETED}>Published</option>
          <option value={TranscodingStatus.PROCESSING}>Processing</option>
          <option value={TranscodingStatus.PENDING}>Pending</option>
          <option value={TranscodingStatus.FAILED}>Failed</option>
        </select>
      </div>

      <div className={styles.filterMeta}>
        <span>Found titles number: {totalCount}</span>
        <span className={styles.metaHint}>
          Refine the list with filters to quickly find the content you need.
        </span>
      </div>
    </section>
  );
}
