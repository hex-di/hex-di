/**
 * FilterBar Component
 *
 * Provides filter controls for the task list:
 * - Status dropdown (All, Todo, In Progress, Done)
 * - Priority dropdown (All, High, Medium, Low)
 * - Project dropdown (All, Project names from API)
 * - Clear All button to reset filters
 *
 * Features:
 * - Syncs with URL query params
 * - Integrates with filter store
 * - Loading state for project dropdown
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import { useProjects } from "../../data/hooks.js";
import type { TaskFilterState, TaskStatus, TaskPriority } from "../../types.js";
import { DEFAULT_FILTERS } from "../../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the FilterBar component.
 */
export interface FilterBarProps {
  /** Current filter state */
  readonly filters: TaskFilterState;
  /** Callback when filters change */
  readonly onFiltersChange: (filters: Partial<TaskFilterState>) => void;
}

// =============================================================================
// Icons
// =============================================================================

function XMarkIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// =============================================================================
// Select Component
// =============================================================================

interface SelectOption {
  readonly value: string;
  readonly label: string;
}

interface SelectProps {
  /** Test ID for the select */
  readonly testId: string;
  /** Current value */
  readonly value: string;
  /** Options to display */
  readonly options: readonly SelectOption[];
  /** Label for the select */
  readonly label: string;
  /** Callback when value changes */
  readonly onChange: (value: string) => void;
  /** Whether the select is loading */
  readonly isLoading?: boolean;
}

function Select({ testId, value, options, label, onChange, isLoading }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 hidden sm:block">{label}</label>
      <select
        data-testid={testId}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={isLoading}
        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed min-w-[120px]"
      >
        {isLoading ? (
          <option>Loading...</option>
        ) : (
          options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

// =============================================================================
// Filter Options
// =============================================================================

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: readonly SelectOption[] = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// =============================================================================
// FilterBar Component
// =============================================================================

/**
 * Filter bar for the task list.
 *
 * Provides dropdowns for status, priority, and project filters.
 * Changes are propagated via the onFiltersChange callback.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const [filters, setFilters] = useState(DEFAULT_FILTERS);
 *
 *   const handleFiltersChange = (updated: Partial<TaskFilterState>) => {
 *     setFilters(prev => ({ ...prev, ...updated, page: 1 }));
 *   };
 *
 *   return (
 *     <div>
 *       <FilterBar
 *         filters={filters}
 *         onFiltersChange={handleFiltersChange}
 *       />
 *       <TaskList filters={filters} />
 *     </div>
 *   );
 * }
 * ```
 */
export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const { data: projects, isLoading: projectsLoading } = useProjects();

  // Build project options
  const projectOptions: readonly SelectOption[] = [
    { value: "all", label: "All Projects" },
    ...(projects?.map(p => ({ value: p.id, label: p.name })) ?? []),
  ];

  // Handlers
  const handleStatusChange = useCallback(
    (value: string) => {
      onFiltersChange({ status: value as TaskStatus | "all" });
    },
    [onFiltersChange]
  );

  const handlePriorityChange = useCallback(
    (value: string) => {
      onFiltersChange({ priority: value as TaskPriority | "all" });
    },
    [onFiltersChange]
  );

  const handleProjectChange = useCallback(
    (value: string) => {
      onFiltersChange({ projectId: value });
    },
    [onFiltersChange]
  );

  const handleClearAll = useCallback(() => {
    onFiltersChange({
      status: DEFAULT_FILTERS.status,
      priority: DEFAULT_FILTERS.priority,
      projectId: DEFAULT_FILTERS.projectId,
    });
  }, [onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters =
    filters.status !== "all" || filters.priority !== "all" || filters.projectId !== "all";

  return (
    <div
      data-testid="filter-bar"
      className="flex flex-wrap items-end gap-3 p-4 bg-white border border-gray-200 rounded-lg"
    >
      <Select
        testId="filter-status"
        label="Status"
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={handleStatusChange}
      />

      <Select
        testId="filter-priority"
        label="Priority"
        value={filters.priority}
        options={PRIORITY_OPTIONS}
        onChange={handlePriorityChange}
      />

      <Select
        testId="filter-project"
        label="Project"
        value={filters.projectId}
        options={projectOptions}
        onChange={handleProjectChange}
        isLoading={projectsLoading}
      />

      <button
        data-testid="filter-clear-all"
        onClick={handleClearAll}
        disabled={!hasActiveFilters}
        className={`
          flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors
          ${
            hasActiveFilters
              ? "text-gray-700 hover:bg-gray-100"
              : "text-gray-400 cursor-not-allowed"
          }
        `}
      >
        <XMarkIcon className="w-4 h-4" />
        <span>Clear All</span>
      </button>
    </div>
  );
}
