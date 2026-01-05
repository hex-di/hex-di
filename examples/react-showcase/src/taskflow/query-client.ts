/**
 * React Query client configuration for the TaskFlow application.
 *
 * Sets up QueryClient with optimized default options for the
 * task management dashboard including stale time and cache settings.
 *
 * @packageDocumentation
 */

import { QueryClient } from "@tanstack/react-query";

// =============================================================================
// Query Client Configuration
// =============================================================================

/**
 * Default stale time for queries (5 minutes).
 * Data is considered fresh for this duration before refetching.
 */
const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Default cache time for queries (30 minutes).
 * Inactive data is garbage collected after this duration.
 */
const DEFAULT_GC_TIME_MS = 30 * 60 * 1000;

/**
 * Number of retry attempts for failed queries.
 */
const DEFAULT_RETRY_COUNT = 1;

/**
 * Creates a configured QueryClient for the TaskFlow application.
 *
 * Configuration includes:
 * - 5 minute stale time for optimal UX without excessive refetching
 * - 30 minute garbage collection time
 * - 1 retry attempt for failed queries
 * - Disabled refetch on window focus for better control
 *
 * @returns Configured QueryClient instance
 *
 * @example
 * ```tsx
 * import { createQueryClient } from './query-client';
 * import { QueryClientProvider } from '@tanstack/react-query';
 *
 * const queryClient = createQueryClient();
 *
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <MyApp />
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        gcTime: DEFAULT_GC_TIME_MS,
        retry: DEFAULT_RETRY_COUNT,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: DEFAULT_RETRY_COUNT,
      },
    },
  });
}

// =============================================================================
// Query Keys
// =============================================================================

/**
 * Query key factory for type-safe query key management.
 *
 * Following React Query best practices for query key organization.
 *
 * @example
 * ```tsx
 * // Get all tasks with filters
 * queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list({ status: 'todo' }) });
 *
 * // Get a specific task
 * queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail('task-123') });
 *
 * // Invalidate all task queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
 * ```
 */
export const queryKeys = {
  /**
   * Task-related query keys.
   */
  tasks: {
    /** Base key for all task queries */
    all: ["tasks"] as const,
    /** Key for task list queries */
    lists: () => [...queryKeys.tasks.all, "list"] as const,
    /** Key for filtered task list query */
    list: (filters: Record<string, unknown>) => [...queryKeys.tasks.lists(), filters] as const,
    /** Key for task detail queries */
    details: () => [...queryKeys.tasks.all, "detail"] as const,
    /** Key for specific task detail query */
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    /** Key for task stats query */
    stats: () => [...queryKeys.tasks.all, "stats"] as const,
  },

  /**
   * Project-related query keys.
   */
  projects: {
    /** Base key for all project queries */
    all: ["projects"] as const,
    /** Key for project list query */
    list: () => [...queryKeys.projects.all, "list"] as const,
    /** Key for specific project query */
    detail: (id: string) => [...queryKeys.projects.all, "detail", id] as const,
  },

  /**
   * Team-related query keys.
   */
  teams: {
    /** Base key for all team queries */
    all: ["teams"] as const,
    /** Key for team list query */
    list: () => [...queryKeys.teams.all, "list"] as const,
    /** Key for team members query */
    members: (teamId: string) => [...queryKeys.teams.all, teamId, "members"] as const,
  },

  /**
   * User-related query keys.
   */
  users: {
    /** Base key for all user queries */
    all: ["users"] as const,
    /** Key for user list query */
    list: () => [...queryKeys.users.all, "list"] as const,
    /** Key for specific user query */
    detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
    /** Key for current user query */
    current: () => [...queryKeys.users.all, "current"] as const,
  },
} as const;
