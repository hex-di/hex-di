/**
 * Inspection Hooks for QueryInspector
 *
 * Provides reactive access to QueryInspector data via useSyncExternalStore.
 * All hooks subscribe to inspector events and re-render when relevant
 * data changes.
 *
 * @packageDocumentation
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
    });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
  if (stryMutAct_9fa48("290")) {
    {
    }
  } else {
    stryCov_9fa48("290");
    const versionRef = useRef(0);
    const cachedRef = useRef<
      | {
          version: number;
          value: T;
        }
      | undefined
    >(undefined);
    const subscribe = useCallback(
      (onStoreChange: () => void): (() => void) => {
        if (stryMutAct_9fa48("291")) {
          {
          }
        } else {
          stryCov_9fa48("291");
          return inspector.subscribe(() => {
            if (stryMutAct_9fa48("292")) {
              {
              }
            } else {
              stryCov_9fa48("292");
              stryMutAct_9fa48("293")
                ? versionRef.current--
                : (stryCov_9fa48("293"), versionRef.current++);
              onStoreChange();
            }
          });
        }
      },
      stryMutAct_9fa48("294") ? [] : (stryCov_9fa48("294"), [inspector])
    );
    const getSnapshot = useCallback(
      (): T => {
        if (stryMutAct_9fa48("295")) {
          {
          }
        } else {
          stryCov_9fa48("295");
          const version = versionRef.current;
          const cached = cachedRef.current;
          if (
            stryMutAct_9fa48("298")
              ? cached !== undefined || cached.version === version
              : stryMutAct_9fa48("297")
                ? false
                : stryMutAct_9fa48("296")
                  ? true
                  : (stryCov_9fa48("296", "297", "298"),
                    (stryMutAct_9fa48("300")
                      ? cached === undefined
                      : stryMutAct_9fa48("299")
                        ? true
                        : (stryCov_9fa48("299", "300"), cached !== undefined)) &&
                      (stryMutAct_9fa48("302")
                        ? cached.version !== version
                        : stryMutAct_9fa48("301")
                          ? true
                          : (stryCov_9fa48("301", "302"), cached.version === version)))
          ) {
            if (stryMutAct_9fa48("303")) {
              {
              }
            } else {
              stryCov_9fa48("303");
              return cached.value;
            }
          }
          const value = compute(inspector);
          cachedRef.current = stryMutAct_9fa48("304")
            ? {}
            : (stryCov_9fa48("304"),
              {
                version,
                value,
              });
          return value;
        }
      },
      stryMutAct_9fa48("305") ? [] : (stryCov_9fa48("305"), [inspector, compute])
    );
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }
}

// =============================================================================
// useQuerySnapshot
// =============================================================================

const computeSnapshot = stryMutAct_9fa48("306")
  ? () => undefined
  : (stryCov_9fa48("306"),
    (() => {
      const computeSnapshot = (api: QueryInspectorAPI): QuerySnapshot => api.getSnapshot();
      return computeSnapshot;
    })());

/**
 * Returns the full inspector snapshot, re-rendering on any cache change.
 *
 * For fine-grained subscriptions, prefer the more specific hooks
 * (useQueryCacheStats, useQueryDiagnostics, etc.).
 */
export function useQuerySnapshot(): QuerySnapshot {
  if (stryMutAct_9fa48("307")) {
    {
    }
  } else {
    stryCov_9fa48("307");
    const inspector = useQueryInspector();
    return useVersionedSnapshot(inspector, computeSnapshot);
  }
}

// =============================================================================
// useQueryDiagnostics
// =============================================================================

const computeDiagnostics = stryMutAct_9fa48("308")
  ? () => undefined
  : (stryCov_9fa48("308"),
    (() => {
      const computeDiagnostics = (api: QueryInspectorAPI): QueryDiagnosticSummary =>
        api.getDiagnosticSummary();
      return computeDiagnostics;
    })());

/**
 * Returns the diagnostic summary (active queries, error rate, dedup savings, etc.).
 */
export function useQueryDiagnostics(): QueryDiagnosticSummary {
  if (stryMutAct_9fa48("309")) {
    {
    }
  } else {
    stryCov_9fa48("309");
    const inspector = useQueryInspector();
    return useVersionedSnapshot(inspector, computeDiagnostics);
  }
}

// =============================================================================
// useQueryCacheStats
// =============================================================================

const computeCacheStats = stryMutAct_9fa48("310")
  ? () => undefined
  : (stryCov_9fa48("310"),
    (() => {
      const computeCacheStats = (api: QueryInspectorAPI): CacheStats => api.getCacheStats();
      return computeCacheStats;
    })());

/**
 * Returns cache statistics (total entries, hit rate, GC eligible, etc.).
 */
export function useQueryCacheStats(): CacheStats {
  if (stryMutAct_9fa48("311")) {
    {
    }
  } else {
    stryCov_9fa48("311");
    const inspector = useQueryInspector();
    return useVersionedSnapshot(inspector, computeCacheStats);
  }
}

// =============================================================================
// useQuerySuggestions
// =============================================================================

const computeSuggestions = stryMutAct_9fa48("312")
  ? () => undefined
  : (stryCov_9fa48("312"),
    (() => {
      const computeSuggestions = (api: QueryInspectorAPI): ReadonlyArray<QuerySuggestion> =>
        api.getQuerySuggestions();
      return computeSuggestions;
    })());

/**
 * Returns performance suggestions (stale queries, invalidation storms, etc.).
 */
export function useQuerySuggestions(): ReadonlyArray<QuerySuggestion> {
  if (stryMutAct_9fa48("313")) {
    {
    }
  } else {
    stryCov_9fa48("313");
    const inspector = useQueryInspector();
    return useVersionedSnapshot(inspector, computeSuggestions);
  }
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
  if (stryMutAct_9fa48("314")) {
    {
    }
  } else {
    stryCov_9fa48("314");
    const inspector = useQueryInspector();

    // Stabilize the filter reference to avoid unnecessary re-computations
    const filterRef = useRef(filter);
    filterRef.current = filter;
    const compute = useCallback(
      stryMutAct_9fa48("315")
        ? () => undefined
        : (stryCov_9fa48("315"),
          (api: QueryInspectorAPI): ReadonlyArray<FetchHistoryEntry> =>
            api.getFetchHistory(filterRef.current)),
      stryMutAct_9fa48("316") ? ["Stryker was here"] : (stryCov_9fa48("316"), [])
    );
    return useVersionedSnapshot(inspector, compute);
  }
}

// =============================================================================
// useQueryInvalidationGraph
// =============================================================================

const computeInvalidationGraph = stryMutAct_9fa48("317")
  ? () => undefined
  : (stryCov_9fa48("317"),
    (() => {
      const computeInvalidationGraph = (api: QueryInspectorAPI): InvalidationGraph =>
        api.getInvalidationGraph();
      return computeInvalidationGraph;
    })());

/**
 * Returns the invalidation graph showing mutation-to-query relationships,
 * runtime edges, cycles, and cascade depth.
 */
export function useQueryInvalidationGraph(): InvalidationGraph {
  if (stryMutAct_9fa48("318")) {
    {
    }
  } else {
    stryCov_9fa48("318");
    const inspector = useQueryInspector();
    return useVersionedSnapshot(inspector, computeInvalidationGraph);
  }
}

// =============================================================================
// useQueryPorts
// =============================================================================

const computeQueryPorts = stryMutAct_9fa48("319")
  ? () => undefined
  : (stryCov_9fa48("319"),
    (() => {
      const computeQueryPorts = (
        api: QueryInspectorAPI
      ): ReadonlyArray<{
        name: string;
        entryCount: number;
        subscriberCount: number;
      }> => api.listQueryPorts();
      return computeQueryPorts;
    })());

/**
 * Returns the list of known query ports with entry counts and subscriber counts.
 */
export function useQueryPorts(): ReadonlyArray<{
  name: string;
  entryCount: number;
  subscriberCount: number;
}> {
  if (stryMutAct_9fa48("320")) {
    {
    }
  } else {
    stryCov_9fa48("320");
    const inspector = useQueryInspector();
    return useVersionedSnapshot(inspector, computeQueryPorts);
  }
}
