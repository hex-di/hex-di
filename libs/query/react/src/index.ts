/**
 * @hex-di/query-react - React Integration for @hex-di/query
 *
 * Provides type-safe React hooks for queries and mutations with
 * useSyncExternalStore for concurrent mode compatibility.
 *
 * @packageDocumentation
 */

// =============================================================================
// Context / Provider
// =============================================================================

export {
  QueryClientProvider,
  useQueryClient,
  type QueryClientProviderProps,
  QueryInspectorProvider,
  useQueryInspector,
  type QueryInspectorProviderProps,
} from "./context/index.js";

// =============================================================================
// Hooks
// =============================================================================

export {
  useQuery,
  useMutation,
  useIsFetching,
  useQueries,
  useInfiniteQuery,
  useSuspenseQuery,
  type UseQueryOptions,
  type UseMutationOptions,
  type MutationResult,
  type MutateCallbacks,
  type QueryFilters,
  type UseQueriesConfig,
  type InfiniteData,
  type UseInfiniteQueryOptions,
  type InfiniteQueryState,
  type SuspenseQueryState,
  type SuspenseQueryOptions,
} from "./hooks/index.js";

// =============================================================================
// Inspection Hooks
// =============================================================================

export {
  useQuerySnapshot,
  useQueryDiagnostics,
  useQueryCacheStats,
  useQuerySuggestions,
  useQueryFetchHistory,
  useQueryInvalidationGraph,
  useQueryPorts,
} from "./hooks/index.js";

// =============================================================================
// Components
// =============================================================================

export { HydrationBoundary, type HydrationBoundaryProps } from "./components/index.js";

// =============================================================================
// Re-exports from @hex-di/query
// =============================================================================

export type {
  QueryClient,
  QueryClientConfig,
  QueryPort,
  MutationPort,
  QueryState,
  MutationState,
  QueryObserver,
  DehydratedState,
  QueryInspectorAPI,
  QuerySnapshot,
  CacheStats,
  QueryDiagnosticSummary,
  QuerySuggestion,
  FetchHistoryEntry,
  FetchHistoryFilter,
  InvalidationGraph,
} from "@hex-di/query";
