/**
 * Page navigation component.
 *
 * Provides previous/next buttons and page number display for paginated
 * Pokemon lists. Disables buttons at boundary pages.
 *
 * @packageDocumentation
 */

import { type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaginationProps {
  readonly currentPage: number;
  readonly totalCount: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: PaginationProps): ReactNode {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <button
        type="button"
        disabled={isFirstPage}
        onClick={() => onPageChange(currentPage - 1)}
        className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm text-gray-400">
        Page {currentPage} of {totalPages}
      </span>
      <button
        type="button"
        disabled={isLastPage}
        onClick={() => onPageChange(currentPage + 1)}
        className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

export { Pagination };
