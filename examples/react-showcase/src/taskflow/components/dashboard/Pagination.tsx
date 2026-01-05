/**
 * Pagination Component
 *
 * Provides navigation controls for paginated lists:
 * - Previous/Next buttons
 * - Current page and total pages display
 * - Optional page size selector
 *
 * Features:
 * - Disabled states for first/last page
 * - Syncs with URL query params (via callback)
 * - Responsive design
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the Pagination component.
 */
export interface PaginationProps {
  /** Current page number (1-based) */
  readonly currentPage: number;
  /** Total number of pages */
  readonly totalPages: number;
  /** Callback when page changes */
  readonly onPageChange: (page: number) => void;
  /** Current page size (optional) */
  readonly pageSize?: number;
  /** Available page sizes (optional) */
  readonly pageSizeOptions?: readonly number[];
  /** Callback when page size changes (optional) */
  readonly onPageSizeChange?: (pageSize: number) => void;
}

// =============================================================================
// Icons
// =============================================================================

function ChevronLeftIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// =============================================================================
// Pagination Component
// =============================================================================

/**
 * Pagination controls for navigating through paginated content.
 *
 * @example
 * ```tsx
 * function TaskListView() {
 *   const [page, setPage] = useState(1);
 *   const { data } = useTaskList({ filters: { ...filters, page } });
 *
 *   return (
 *     <div>
 *       <TaskList tasks={data?.tasks ?? []} />
 *       <Pagination
 *         currentPage={page}
 *         totalPages={data?.totalPages ?? 1}
 *         onPageChange={setPage}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  const handlePrevious = () => {
    if (!isFirstPage) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (!isLastPage) {
      onPageChange(currentPage + 1);
    }
  };

  // Don't render if there's only one page
  if (totalPages <= 1 && !pageSizeOptions) {
    return null;
  }

  return (
    <div
      data-testid="pagination"
      className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg"
    >
      {/* Left side: Page size selector (optional) */}
      <div className="flex items-center gap-2">
        {pageSizeOptions && pageSize && onPageSizeChange && (
          <>
            <label htmlFor="page-size" className="text-sm text-gray-600">
              Show:
            </label>
            <select
              id="page-size"
              data-testid="pagination-page-size"
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Center: Page info */}
      <div data-testid="pagination-info" className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </div>

      {/* Right side: Navigation buttons */}
      <div className="flex items-center gap-2">
        <button
          data-testid="pagination-prev"
          onClick={handlePrevious}
          disabled={isFirstPage}
          className={`
            flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors
            ${
              isFirstPage
                ? "text-gray-400 cursor-not-allowed bg-gray-100"
                : "text-gray-700 hover:bg-gray-100"
            }
          `}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <button
          data-testid="pagination-next"
          onClick={handleNext}
          disabled={isLastPage}
          className={`
            flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors
            ${
              isLastPage
                ? "text-gray-400 cursor-not-allowed bg-gray-100"
                : "text-gray-700 hover:bg-gray-100"
            }
          `}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
