/**
 * StatsCards Component
 *
 * Displays aggregated task statistics in four cards:
 * - TODO count
 * - In Progress count
 * - Done count
 * - Due Today count
 *
 * Features:
 * - Loading skeleton state
 * - Error state with retry
 * - Visual icons for each status
 * - Consistent styling following wireframe Section 2.1
 *
 * @packageDocumentation
 */

import { useTaskStats } from "../../data/hooks.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for individual stat card.
 */
interface StatCardProps {
  /** Card label */
  readonly label: string;
  /** Numeric count value */
  readonly count: number;
  /** Icon to display */
  readonly icon: React.ReactNode;
  /** Variant for styling */
  readonly variant: "todo" | "in-progress" | "done" | "due-today";
  /** Test ID for the card */
  readonly testId: string;
}

// =============================================================================
// Icons
// =============================================================================

function CheckCircleIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PlayCircleIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CircleIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ClockIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// =============================================================================
// Skeleton Component
// =============================================================================

function StatCardSkeleton() {
  return (
    <div
      data-testid="stats-card-skeleton"
      className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// StatCard Component
// =============================================================================

const variantStyles = {
  todo: {
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
  },
  "in-progress": {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  done: {
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  "due-today": {
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
} as const;

function StatCard({ label, count, icon, variant, testId }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      data-testid={testId}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${styles.iconBg}`}>
          <div className={styles.iconColor}>{icon}</div>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p data-testid={`stat-count-${variant}`} className="text-2xl font-bold text-gray-900">
            {count}
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">tasks</p>
    </div>
  );
}

// =============================================================================
// StatsCards Component
// =============================================================================

/**
 * Displays the four stats cards on the dashboard.
 *
 * Uses the useTaskStats hook to fetch aggregated task counts.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   return (
 *     <div>
 *       <StatsCards />
 *       <FilterBar ... />
 *       <TaskList ... />
 *     </div>
 *   );
 * }
 * ```
 */
export function StatsCards() {
  const { data: stats, isLoading, error, refetch } = useTaskStats();

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">Failed to load statistics</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-red-700 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Success state
  return (
    <div data-testid="stats-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        testId="stat-card-todo"
        label="TODO"
        count={stats?.todoCount ?? 0}
        icon={<CircleIcon className="w-6 h-6" />}
        variant="todo"
      />
      <StatCard
        testId="stat-card-in-progress"
        label="In Progress"
        count={stats?.inProgressCount ?? 0}
        icon={<PlayCircleIcon className="w-6 h-6" />}
        variant="in-progress"
      />
      <StatCard
        testId="stat-card-done"
        label="Done"
        count={stats?.doneCount ?? 0}
        icon={<CheckCircleIcon className="w-6 h-6" />}
        variant="done"
      />
      <StatCard
        testId="stat-card-due-today"
        label="Due Today"
        count={stats?.dueTodayCount ?? 0}
        icon={<ClockIcon className="w-6 h-6" />}
        variant="due-today"
      />
    </div>
  );
}
