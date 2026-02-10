/**
 * Inspection Hooks for QueryInspector
 *
 * Provides reactive access to QueryInspector data via useSyncExternalStore.
 * All hooks subscribe to inspector events and re-render when relevant
 * data changes.
 *
 * @packageDocumentation
 */

import { useSyncExternalStore, useCallback, useRef } from "react";
import type {
  QueryInspectorAPI,
  QuerySnapshot,
  CacheStats,
  QueryDiagnosticSummary,
  QuerySuggestion,
  FetchHistoryEntry,
  FetchHistoryFilter,
  InvalidationGraph,
} from "@hex-di/query";
import { useQueryInspector } from "../context/query-inspector-context.js";

// =============================================================================
// Internal: Snapshot versioning
//
// useSyncExternalStore requires getSnapshot to return a referentially stable
// value when nothing has changed. Inspector methods return new objects each
// call, so we use a monotonic version counter incremented by subscribe
// callbacks. getSnapshot only recomputes when the version changes.
// =============================================================================

function useVersionedSnapshot<T>(
  inspector: QueryInspectorAPI,
  compute: (api: QueryInspectorAPI) => T
): T {
  const versionRef = useRef(0);
  const cachedRef = useRef<{ version: number; value: T } | undefined>(undefined);

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      return inspector.subscribe(() => {
        versionRef.current++;
        onStoreChange();
      });
    },
    [inspector]
  );

  const getSnapshot = useCallback((): T => {
    const version = versionRef.current;
    const cached = cachedRef.current;
    if (cached !== undefined && cached.version === version) {
      return cached.value;
    }
    const value = compute(inspector);
    cachedRef.current = { version, value };
    return value;
  }, [inspector, compute]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// =============================================================================
// useQuerySnapshot
// =============================================================================

const computeSnapshot = (api: QueryInspectorAPI): QuerySnapshot => api.getSnapshot();

/**
 * Returns the full inspector snapshot, re-rendering on any cache change.
 *
 * For fine-grained subscriptions, prefer the more specific hooks
 * (useQueryCacheStats, useQueryDiagnostics, etc.).
 */
export function useQuerySnapshot(): QuerySnapshot {
  const inspector = useQueryInspector();
  return useVersionedSnapshot(inspector, computeSnapshot);
}

// =============================================================================
// useQueryDiagnostics
// =============================================================================

const computeDiagnostics = (api: QueryInspectorAPI): QueryDiagnosticSummary =>
  api.getDiagnosticSummary();

/**
 * Returns the diagnostic summary (active queries, error rate, dedup savings, etc.).
 */
export function useQueryDiagnostics(): QueryDiagnosticSummary {
  const inspector = useQueryInspector();
  return useVersionedSnapshot(inspector, computeDiagnostics);
}

// =============================================================================
// useQueryCacheStats
// =============================================================================

const computeCacheStats = (api: QueryInspectorAPI): CacheStats => api.getCacheStats();

/**
 * Returns cache statistics (total entries, hit rate, GC eligible, etc.).
 */
export function useQueryCacheStats(): CacheStats {
  const inspector = useQueryInspector();
  return useVersionedSnapshot(inspector, computeCacheStats);
}

// =============================================================================
// useQuerySuggestions
// =============================================================================

const computeSuggestions = (api: QueryInspectorAPI): ReadonlyArray<QuerySuggestion> =>
  api.getQuerySuggestions();

/**
 * Returns performance suggestions (stale queries, invalidation storms, etc.).
 */
export function useQuerySuggestions(): ReadonlyArray<QuerySuggestion> {
  const inspector = useQueryInspector();
  return useVersionedSnapshot(inspector, computeSuggestions);
}

// =============================================================================
// useQueryFetchHistory
// =============================================================================

/**
 * Returns fetch history entries, optionally filtered.
 *
 * @param filter - Optional filter for port name, result type, duration, etc.
 */
export function useQueryFetchHistory(
  filter?: FetchHistoryFilter
): ReadonlyArray<FetchHistoryEntry> {
  const inspector = useQueryInspector();

  // Stabilize the filter reference to avoid unnecessary re-computations
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const compute = useCallback(
    (api: QueryInspectorAPI): ReadonlyArray<FetchHistoryEntry> =>
      api.getFetchHistory(filterRef.current),
    []
  );

  return useVersionedSnapshot(inspector, compute);
}

// =============================================================================
// useQueryInvalidationGraph
// =============================================================================

const computeInvalidationGraph = (api: QueryInspectorAPI): InvalidationGraph =>
  api.getInvalidationGraph();

/**
 * Returns the invalidation graph showing mutation-to-query relationships,
 * runtime edges, cycles, and cascade depth.
 */
export function useQueryInvalidationGraph(): InvalidationGraph {
  const inspector = useQueryInspector();
  return useVersionedSnapshot(inspector, computeInvalidationGraph);
}

// =============================================================================
// useQueryPorts
// =============================================================================

const computeQueryPorts = (
  api: QueryInspectorAPI
): ReadonlyArray<{ name: string; entryCount: number; subscriberCount: number }> =>
  api.listQueryPorts();

/**
 * Returns the list of known query ports with entry counts and subscriber counts.
 */
export function useQueryPorts(): ReadonlyArray<{
  name: string;
  entryCount: number;
  subscriberCount: number;
}> {
  const inspector = useQueryInspector();
  return useVersionedSnapshot(inspector, computeQueryPorts);
}
