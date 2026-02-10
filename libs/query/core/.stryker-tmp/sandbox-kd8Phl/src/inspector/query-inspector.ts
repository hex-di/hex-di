/**
 * QueryInspector - Enhanced introspection API for query cache debugging.
 *
 * Provides fetch history, invalidation graph analysis, dependency graph,
 * diagnostics, and suggestions for the query system.
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
import type { QueryClient, QueryClientEvent } from "../client/query-client.js";
import type { CacheListener } from "../cache/query-cache.js";
import type { CacheEntry } from "../cache/cache-entry.js";
import type { CacheKey } from "../cache/cache-key.js";

// =============================================================================
// QuerySnapshot
// =============================================================================

export interface QuerySnapshot {
  readonly key: CacheKey;
  readonly entry: CacheEntry<unknown, unknown>;
  readonly isActive: boolean;
  readonly isStale: boolean;
  readonly isFetching: boolean;
}

// =============================================================================
// Inspector Event Types
// =============================================================================

export type QueryInspectorEvent =
  | {
      type: "fetch-started";
      portName: string;
      params: unknown;
      timestamp: number;
    }
  | {
      type: "fetch-completed";
      portName: string;
      params: unknown;
      durationMs: number;
      timestamp: number;
    }
  | {
      type: "fetch-cancelled";
      portName: string;
      params: unknown;
      timestamp: number;
    }
  | {
      type: "cache-hit";
      portName: string;
      params: unknown;
      timestamp: number;
    }
  | {
      type: "deduplicated";
      portName: string;
      params: unknown;
      timestamp: number;
    }
  | {
      type: "invalidated";
      portName: string;
      params: unknown;
      timestamp: number;
    }
  | {
      type: "gc-collected";
      key: string;
      timestamp: number;
    }
  | {
      type: "observer-added";
      portName: string;
      params: unknown;
      timestamp: number;
    }
  | {
      type: "observer-removed";
      portName: string;
      params: unknown;
      timestamp: number;
    }
  | {
      type: "retry";
      portName: string;
      params: unknown;
      attempt: number;
      timestamp: number;
    }
  | {
      type: "dependency-cycle-detected";
      chain: readonly string[];
      timestamp: number;
    };

// =============================================================================
// Fetch History
// =============================================================================

export interface FetchHistoryEntry {
  readonly portName: string;
  readonly params: unknown;
  readonly cacheKey: string;
  readonly timestamp: number;
  readonly durationMs: number;
  readonly result: "ok" | "error";
  readonly errorTag?: string;
  readonly cacheHit: boolean;
  readonly deduplicated: boolean;
  readonly retryAttempt: number;
  readonly trigger: "mount" | "refetch" | "invalidation" | "manual";
}
export interface FetchHistoryFilter {
  readonly portName?: string;
  readonly result?: "ok" | "error";
  readonly minDurationMs?: number;
  readonly limit?: number;
  readonly since?: number;
  readonly trigger?: FetchHistoryEntry["trigger"];
}

// =============================================================================
// Invalidation Graph
// =============================================================================

export interface InvalidationGraph {
  readonly nodes: ReadonlyArray<string>;
  readonly edges: ReadonlyArray<{
    from: string;
    to: string;
    type: "invalidates" | "removes";
  }>;
  readonly cycles: ReadonlyArray<ReadonlyArray<string>>;
  readonly maxCascadeDepth: number;
  readonly warnings: ReadonlyArray<string>;
}

// =============================================================================
// Dependency Graph
// =============================================================================

export interface QueryDependencyGraph {
  readonly staticEdges: ReadonlyArray<{
    from: string;
    to: string;
  }>;
  readonly dynamicEdges: ReadonlyArray<{
    from: string;
    to: string;
  }>;
  readonly cycles: ReadonlyArray<ReadonlyArray<string>>;
}

// =============================================================================
// Diagnostics
// =============================================================================

export interface QueryDiagnosticSummary {
  readonly totalQueries: number;
  readonly activeQueries: number;
  readonly staleQueries: number;
  readonly errorQueries: number;
  readonly inFlightCount: number;
  readonly cacheHitRate: number;
  readonly avgFetchDurationMs: number;
  readonly gcEligibleCount: number;
  readonly totalFetches: number;
  readonly errorRate: number;
}

// =============================================================================
// Suggestions
// =============================================================================

export interface QuerySuggestion {
  readonly type: "stale_query" | "invalidation_storm" | "high_error_rate" | "large_cache_entry";
  readonly portName: string;
  readonly message: string;
  readonly action: string;
}

// =============================================================================
// Cache Stats
// =============================================================================

export interface CacheStats {
  readonly totalEntries: number;
  readonly activeEntries: number;
  readonly staleEntries: number;
  readonly errorEntries: number;
  readonly inFlightCount: number;
  readonly cacheHitRate: number;
  readonly avgFetchDurationMs: number;
  readonly gcEligibleCount: number;
}

// =============================================================================
// Inspector Options & API
// =============================================================================

export interface QueryInspectorOptions {
  readonly historySize?: number;
  readonly defaultStaleTime?: number;
}
export interface QueryInspectorAPI {
  getSnapshots(): ReadonlyArray<QuerySnapshot>;
  getSnapshot(key: CacheKey): QuerySnapshot | undefined;
  subscribe(listener: CacheListener): () => void;
  getStats(): CacheStats;
  getFetchHistory(filter?: FetchHistoryFilter): ReadonlyArray<FetchHistoryEntry>;
  getInvalidationGraph(): InvalidationGraph;
  getDependencyGraph(): QueryDependencyGraph;
  getDiagnostics(): QueryDiagnosticSummary;
  getSuggestions(): ReadonlyArray<QuerySuggestion>;
  listQueryPorts(): ReadonlyArray<{
    name: string;
    entryCount: number;
    observerCount: number;
  }>;
  dispose(): void;
}

// =============================================================================
// Internal: Ring Buffer for Fetch History
// =============================================================================

function createRingBuffer<T>(capacity: number): {
  push(item: T): void;
  toArray(): ReadonlyArray<T>;
  readonly size: number;
} {
  if (stryMutAct_9fa48("860")) {
    {
    }
  } else {
    stryCov_9fa48("860");
    const buffer: Array<T | undefined> = (
      stryMutAct_9fa48("861") ? new Array() : (stryCov_9fa48("861"), new Array(capacity))
    ).fill(undefined);
    let writeIndex = 0;
    let count = 0;
    return stryMutAct_9fa48("862")
      ? {}
      : (stryCov_9fa48("862"),
        {
          push(item: T): void {
            if (stryMutAct_9fa48("863")) {
              {
              }
            } else {
              stryCov_9fa48("863");
              buffer[writeIndex] = item;
              writeIndex = stryMutAct_9fa48("864")
                ? (writeIndex + 1) * capacity
                : (stryCov_9fa48("864"),
                  (stryMutAct_9fa48("865")
                    ? writeIndex - 1
                    : (stryCov_9fa48("865"), writeIndex + 1)) % capacity);
              if (
                stryMutAct_9fa48("869")
                  ? count >= capacity
                  : stryMutAct_9fa48("868")
                    ? count <= capacity
                    : stryMutAct_9fa48("867")
                      ? false
                      : stryMutAct_9fa48("866")
                        ? true
                        : (stryCov_9fa48("866", "867", "868", "869"), count < capacity)
              )
                stryMutAct_9fa48("870") ? count-- : (stryCov_9fa48("870"), count++);
            }
          },
          toArray(): ReadonlyArray<T> {
            if (stryMutAct_9fa48("871")) {
              {
              }
            } else {
              stryCov_9fa48("871");
              if (
                stryMutAct_9fa48("874")
                  ? count !== 0
                  : stryMutAct_9fa48("873")
                    ? false
                    : stryMutAct_9fa48("872")
                      ? true
                      : (stryCov_9fa48("872", "873", "874"), count === 0)
              )
                return stryMutAct_9fa48("875") ? ["Stryker was here"] : (stryCov_9fa48("875"), []);
              const result: T[] = stryMutAct_9fa48("876")
                ? ["Stryker was here"]
                : (stryCov_9fa48("876"), []);
              const start = (
                stryMutAct_9fa48("880")
                  ? count >= capacity
                  : stryMutAct_9fa48("879")
                    ? count <= capacity
                    : stryMutAct_9fa48("878")
                      ? false
                      : stryMutAct_9fa48("877")
                        ? true
                        : (stryCov_9fa48("877", "878", "879", "880"), count < capacity)
              )
                ? 0
                : writeIndex;
              for (
                let i = 0;
                stryMutAct_9fa48("883")
                  ? i >= count
                  : stryMutAct_9fa48("882")
                    ? i <= count
                    : stryMutAct_9fa48("881")
                      ? false
                      : (stryCov_9fa48("881", "882", "883"), i < count);
                stryMutAct_9fa48("884") ? i-- : (stryCov_9fa48("884"), i++)
              ) {
                if (stryMutAct_9fa48("885")) {
                  {
                  }
                } else {
                  stryCov_9fa48("885");
                  const idx = stryMutAct_9fa48("886")
                    ? (start + i) * capacity
                    : (stryCov_9fa48("886"),
                      (stryMutAct_9fa48("887") ? start - i : (stryCov_9fa48("887"), start + i)) %
                        capacity);
                  const item = buffer[idx];
                  if (
                    stryMutAct_9fa48("890")
                      ? item === undefined
                      : stryMutAct_9fa48("889")
                        ? false
                        : stryMutAct_9fa48("888")
                          ? true
                          : (stryCov_9fa48("888", "889", "890"), item !== undefined)
                  ) {
                    if (stryMutAct_9fa48("891")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("891");
                      result.push(item);
                    }
                  }
                }
              }
              return result;
            }
          },
          get size(): number {
            if (stryMutAct_9fa48("892")) {
              {
              }
            } else {
              stryCov_9fa48("892");
              return count;
            }
          },
        });
  }
}

// =============================================================================
// Internal: Cycle Detection via Iterative DFS
// =============================================================================

function detectCycles(
  nodes: ReadonlyArray<string>,
  adjacency: ReadonlyMap<string, ReadonlyArray<string>>
): ReadonlyArray<ReadonlyArray<string>> {
  if (stryMutAct_9fa48("893")) {
    {
    }
  } else {
    stryCov_9fa48("893");
    const cycles: Array<ReadonlyArray<string>> = stryMutAct_9fa48("894")
      ? ["Stryker was here"]
      : (stryCov_9fa48("894"), []);
    const visited = new Set<string>();
    const inStack = new Set<string>();
    for (const startNode of nodes) {
      if (stryMutAct_9fa48("895")) {
        {
        }
      } else {
        stryCov_9fa48("895");
        if (
          stryMutAct_9fa48("897")
            ? false
            : stryMutAct_9fa48("896")
              ? true
              : (stryCov_9fa48("896", "897"), visited.has(startNode))
        )
          continue;

        // Iterative DFS with explicit stack
        const stack: Array<{
          node: string;
          neighborIdx: number;
          path: string[];
        }> = stryMutAct_9fa48("898") ? ["Stryker was here"] : (stryCov_9fa48("898"), []);
        stack.push(
          stryMutAct_9fa48("899")
            ? {}
            : (stryCov_9fa48("899"),
              {
                node: startNode,
                neighborIdx: 0,
                path: stryMutAct_9fa48("900") ? [] : (stryCov_9fa48("900"), [startNode]),
              })
        );
        inStack.add(startNode);
        while (
          stryMutAct_9fa48("903")
            ? stack.length <= 0
            : stryMutAct_9fa48("902")
              ? stack.length >= 0
              : stryMutAct_9fa48("901")
                ? false
                : (stryCov_9fa48("901", "902", "903"), stack.length > 0)
        ) {
          if (stryMutAct_9fa48("904")) {
            {
            }
          } else {
            stryCov_9fa48("904");
            const frame =
              stack[
                stryMutAct_9fa48("905")
                  ? stack.length + 1
                  : (stryCov_9fa48("905"), stack.length - 1)
              ];
            const neighbors = stryMutAct_9fa48("906")
              ? adjacency.get(frame.node) && []
              : (stryCov_9fa48("906"),
                adjacency.get(frame.node) ??
                  (stryMutAct_9fa48("907") ? ["Stryker was here"] : (stryCov_9fa48("907"), [])));
            if (
              stryMutAct_9fa48("911")
                ? frame.neighborIdx < neighbors.length
                : stryMutAct_9fa48("910")
                  ? frame.neighborIdx > neighbors.length
                  : stryMutAct_9fa48("909")
                    ? false
                    : stryMutAct_9fa48("908")
                      ? true
                      : (stryCov_9fa48("908", "909", "910", "911"),
                        frame.neighborIdx >= neighbors.length)
            ) {
              if (stryMutAct_9fa48("912")) {
                {
                }
              } else {
                stryCov_9fa48("912");
                // Done with this node
                stack.pop();
                inStack.delete(frame.node);
                visited.add(frame.node);
                continue;
              }
            }
            const neighbor = neighbors[frame.neighborIdx];
            stryMutAct_9fa48("913")
              ? frame.neighborIdx--
              : (stryCov_9fa48("913"), frame.neighborIdx++);
            if (
              stryMutAct_9fa48("915")
                ? false
                : stryMutAct_9fa48("914")
                  ? true
                  : (stryCov_9fa48("914", "915"), inStack.has(neighbor))
            ) {
              if (stryMutAct_9fa48("916")) {
                {
                }
              } else {
                stryCov_9fa48("916");
                // Found a cycle
                const cycleStart = frame.path.indexOf(neighbor);
                if (
                  stryMutAct_9fa48("920")
                    ? cycleStart < 0
                    : stryMutAct_9fa48("919")
                      ? cycleStart > 0
                      : stryMutAct_9fa48("918")
                        ? false
                        : stryMutAct_9fa48("917")
                          ? true
                          : (stryCov_9fa48("917", "918", "919", "920"), cycleStart >= 0)
                ) {
                  if (stryMutAct_9fa48("921")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("921");
                    cycles.push(
                      stryMutAct_9fa48("922")
                        ? []
                        : (stryCov_9fa48("922"),
                          [
                            ...(stryMutAct_9fa48("923")
                              ? frame.path
                              : (stryCov_9fa48("923"), frame.path.slice(cycleStart))),
                            neighbor,
                          ])
                    );
                  }
                }
              }
            } else if (
              stryMutAct_9fa48("926")
                ? false
                : stryMutAct_9fa48("925")
                  ? true
                  : stryMutAct_9fa48("924")
                    ? visited.has(neighbor)
                    : (stryCov_9fa48("924", "925", "926"), !visited.has(neighbor))
            ) {
              if (stryMutAct_9fa48("927")) {
                {
                }
              } else {
                stryCov_9fa48("927");
                inStack.add(neighbor);
                stack.push(
                  stryMutAct_9fa48("928")
                    ? {}
                    : (stryCov_9fa48("928"),
                      {
                        node: neighbor,
                        neighborIdx: 0,
                        path: stryMutAct_9fa48("929")
                          ? []
                          : (stryCov_9fa48("929"), [...frame.path, neighbor]),
                      })
                );
              }
            }
          }
        }
      }
    }
    return cycles;
  }
}

// =============================================================================
// Internal: Compute Max Cascade Depth
// =============================================================================

function computeMaxCascadeDepth(adjacency: ReadonlyMap<string, ReadonlyArray<string>>): number {
  if (stryMutAct_9fa48("930")) {
    {
    }
  } else {
    stryCov_9fa48("930");
    let maxDepth = 0;
    const memo = new Map<string, number>();
    function dfs(node: string, visited: Set<string>): number {
      if (stryMutAct_9fa48("931")) {
        {
        }
      } else {
        stryCov_9fa48("931");
        if (
          stryMutAct_9fa48("933")
            ? false
            : stryMutAct_9fa48("932")
              ? true
              : (stryCov_9fa48("932", "933"), memo.has(node))
        )
          return stryMutAct_9fa48("934")
            ? memo.get(node) && 0
            : (stryCov_9fa48("934"), memo.get(node) ?? 0);
        if (
          stryMutAct_9fa48("936")
            ? false
            : stryMutAct_9fa48("935")
              ? true
              : (stryCov_9fa48("935", "936"), visited.has(node))
        )
          return 0; // cycle -- stop

        visited.add(node);
        const neighbors = stryMutAct_9fa48("937")
          ? adjacency.get(node) && []
          : (stryCov_9fa48("937"),
            adjacency.get(node) ??
              (stryMutAct_9fa48("938") ? ["Stryker was here"] : (stryCov_9fa48("938"), [])));
        let depth = 0;
        for (const neighbor of neighbors) {
          if (stryMutAct_9fa48("939")) {
            {
            }
          } else {
            stryCov_9fa48("939");
            depth = stryMutAct_9fa48("940")
              ? Math.min(depth, 1 + dfs(neighbor, visited))
              : (stryCov_9fa48("940"),
                Math.max(
                  depth,
                  stryMutAct_9fa48("941")
                    ? 1 - dfs(neighbor, visited)
                    : (stryCov_9fa48("941"), 1 + dfs(neighbor, visited))
                ));
          }
        }
        visited.delete(node);
        memo.set(node, depth);
        return depth;
      }
    }
    for (const node of adjacency.keys()) {
      if (stryMutAct_9fa48("942")) {
        {
        }
      } else {
        stryCov_9fa48("942");
        maxDepth = stryMutAct_9fa48("943")
          ? Math.min(maxDepth, dfs(node, new Set()))
          : (stryCov_9fa48("943"), Math.max(maxDepth, dfs(node, new Set())));
      }
    }
    return maxDepth;
  }
}

// =============================================================================
// createQueryInspector Factory
// =============================================================================

export function createQueryInspector(
  client: QueryClient,
  options?: QueryInspectorOptions
): QueryInspectorAPI {
  if (stryMutAct_9fa48("944")) {
    {
    }
  } else {
    stryCov_9fa48("944");
    const historySize = stryMutAct_9fa48("945")
      ? options?.historySize && 1000
      : (stryCov_9fa48("945"),
        (stryMutAct_9fa48("946")
          ? options.historySize
          : (stryCov_9fa48("946"), options?.historySize)) ?? 1000);
    const defaultStaleTime = stryMutAct_9fa48("947")
      ? options?.defaultStaleTime && client.defaults.staleTime
      : (stryCov_9fa48("947"),
        (stryMutAct_9fa48("948")
          ? options.defaultStaleTime
          : (stryCov_9fa48("948"), options?.defaultStaleTime)) ?? client.defaults.staleTime);
    const cache = client.cache;

    // Fetch history ring buffer
    const fetchHistory = createRingBuffer<FetchHistoryEntry>(historySize);

    // Track pending fetches for duration calculation
    const pendingFetches = new Map<
      string,
      {
        timestamp: number;
        retryAttempt: number;
      }
    >();

    // Track cache hits and deduplication for current fetches
    const recentCacheHits = new Set<string>();
    const recentDeduplicated = new Set<string>();

    // Counters for hit rate
    let totalFetchRequests = 0;
    let totalCacheHits = 0;

    // Subscribe to client events to build fetch history
    const unsubscribeEvents = client.subscribeToEvents((event: QueryClientEvent) => {
      if (stryMutAct_9fa48("949")) {
        {
        }
      } else {
        stryCov_9fa48("949");
        const eventKey = stryMutAct_9fa48("950")
          ? ``
          : (stryCov_9fa48("950"),
            `${event.portName}:${JSON.stringify((stryMutAct_9fa48("951") ? "" : (stryCov_9fa48("951"), "params")) in event ? event.params : undefined)}`);
        switch (event.type) {
          case stryMutAct_9fa48("953") ? "" : (stryCov_9fa48("953"), "fetch-started"):
            if (stryMutAct_9fa48("952")) {
            } else {
              stryCov_9fa48("952");
              {
                if (stryMutAct_9fa48("954")) {
                  {
                  }
                } else {
                  stryCov_9fa48("954");
                  stryMutAct_9fa48("955")
                    ? totalFetchRequests--
                    : (stryCov_9fa48("955"), totalFetchRequests++);
                  pendingFetches.set(
                    eventKey,
                    stryMutAct_9fa48("956")
                      ? {}
                      : (stryCov_9fa48("956"),
                        {
                          timestamp: Date.now(),
                          retryAttempt: 0,
                        })
                  );
                  break;
                }
              }
            }
          case stryMutAct_9fa48("958") ? "" : (stryCov_9fa48("958"), "fetch-completed"):
            if (stryMutAct_9fa48("957")) {
            } else {
              stryCov_9fa48("957");
              {
                if (stryMutAct_9fa48("959")) {
                  {
                  }
                } else {
                  stryCov_9fa48("959");
                  const pending = pendingFetches.get(eventKey);
                  pendingFetches.delete(eventKey);
                  const wasCacheHit = recentCacheHits.has(eventKey);
                  const wasDeduplicated = recentDeduplicated.has(eventKey);
                  recentCacheHits.delete(eventKey);
                  recentDeduplicated.delete(eventKey);
                  fetchHistory.push(
                    stryMutAct_9fa48("960")
                      ? {}
                      : (stryCov_9fa48("960"),
                        {
                          portName: event.portName,
                          params: event.params,
                          cacheKey: eventKey,
                          timestamp: stryMutAct_9fa48("961")
                            ? pending?.timestamp && Date.now()
                            : (stryCov_9fa48("961"),
                              (stryMutAct_9fa48("962")
                                ? pending.timestamp
                                : (stryCov_9fa48("962"), pending?.timestamp)) ?? Date.now()),
                          durationMs: event.durationMs,
                          result: stryMutAct_9fa48("963") ? "" : (stryCov_9fa48("963"), "ok"),
                          cacheHit: wasCacheHit,
                          deduplicated: wasDeduplicated,
                          retryAttempt: stryMutAct_9fa48("964")
                            ? pending?.retryAttempt && 0
                            : (stryCov_9fa48("964"),
                              (stryMutAct_9fa48("965")
                                ? pending.retryAttempt
                                : (stryCov_9fa48("965"), pending?.retryAttempt)) ?? 0),
                          trigger: stryMutAct_9fa48("966") ? "" : (stryCov_9fa48("966"), "manual"),
                        })
                  );
                  break;
                }
              }
            }
          case stryMutAct_9fa48("968") ? "" : (stryCov_9fa48("968"), "fetch-cancelled"):
            if (stryMutAct_9fa48("967")) {
            } else {
              stryCov_9fa48("967");
              {
                if (stryMutAct_9fa48("969")) {
                  {
                  }
                } else {
                  stryCov_9fa48("969");
                  pendingFetches.delete(eventKey);
                  recentCacheHits.delete(eventKey);
                  recentDeduplicated.delete(eventKey);
                  break;
                }
              }
            }
          case stryMutAct_9fa48("971") ? "" : (stryCov_9fa48("971"), "cache-hit"):
            if (stryMutAct_9fa48("970")) {
            } else {
              stryCov_9fa48("970");
              {
                if (stryMutAct_9fa48("972")) {
                  {
                  }
                } else {
                  stryCov_9fa48("972");
                  stryMutAct_9fa48("973")
                    ? totalCacheHits--
                    : (stryCov_9fa48("973"), totalCacheHits++);
                  recentCacheHits.add(eventKey);
                  break;
                }
              }
            }
          case stryMutAct_9fa48("975") ? "" : (stryCov_9fa48("975"), "deduplicated"):
            if (stryMutAct_9fa48("974")) {
            } else {
              stryCov_9fa48("974");
              {
                if (stryMutAct_9fa48("976")) {
                  {
                  }
                } else {
                  stryCov_9fa48("976");
                  recentDeduplicated.add(eventKey);
                  break;
                }
              }
            }
          case stryMutAct_9fa48("978") ? "" : (stryCov_9fa48("978"), "retry"):
            if (stryMutAct_9fa48("977")) {
            } else {
              stryCov_9fa48("977");
              {
                if (stryMutAct_9fa48("979")) {
                  {
                  }
                } else {
                  stryCov_9fa48("979");
                  const pending = pendingFetches.get(eventKey);
                  if (
                    stryMutAct_9fa48("981")
                      ? false
                      : stryMutAct_9fa48("980")
                        ? true
                        : (stryCov_9fa48("980", "981"), pending)
                  ) {
                    if (stryMutAct_9fa48("982")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("982");
                      pending.retryAttempt = event.attempt;
                    }
                  }
                  break;
                }
              }
            }
          case stryMutAct_9fa48("983") ? "" : (stryCov_9fa48("983"), "invalidated"):
          case stryMutAct_9fa48("984") ? "" : (stryCov_9fa48("984"), "observer-added"):
          case stryMutAct_9fa48("985") ? "" : (stryCov_9fa48("985"), "observer-removed"):
          case stryMutAct_9fa48("986") ? "" : (stryCov_9fa48("986"), "mutation-started"):
          case stryMutAct_9fa48("988") ? "" : (stryCov_9fa48("988"), "mutation-completed"):
            if (stryMutAct_9fa48("987")) {
            } else {
              stryCov_9fa48("987");
              // These events don't directly contribute to fetch history
              break;
            }
        }
      }
    });
    function isStale(entry: CacheEntry<unknown, unknown>): boolean {
      if (stryMutAct_9fa48("989")) {
        {
        }
      } else {
        stryCov_9fa48("989");
        if (
          stryMutAct_9fa48("991")
            ? false
            : stryMutAct_9fa48("990")
              ? true
              : (stryCov_9fa48("990", "991"), entry.isInvalidated)
        )
          return stryMutAct_9fa48("992") ? false : (stryCov_9fa48("992"), true);
        if (
          stryMutAct_9fa48("995")
            ? entry.dataUpdatedAt !== undefined
            : stryMutAct_9fa48("994")
              ? false
              : stryMutAct_9fa48("993")
                ? true
                : (stryCov_9fa48("993", "994", "995"), entry.dataUpdatedAt === undefined)
        )
          return stryMutAct_9fa48("996") ? false : (stryCov_9fa48("996"), true);
        return stryMutAct_9fa48("1000")
          ? Date.now() - entry.dataUpdatedAt <= defaultStaleTime
          : stryMutAct_9fa48("999")
            ? Date.now() - entry.dataUpdatedAt >= defaultStaleTime
            : stryMutAct_9fa48("998")
              ? false
              : stryMutAct_9fa48("997")
                ? true
                : (stryCov_9fa48("997", "998", "999", "1000"),
                  (stryMutAct_9fa48("1001")
                    ? Date.now() + entry.dataUpdatedAt
                    : (stryCov_9fa48("1001"), Date.now() - entry.dataUpdatedAt)) >
                    defaultStaleTime);
      }
    }
    function isGcEligible(entry: CacheEntry<unknown, unknown>): boolean {
      if (stryMutAct_9fa48("1002")) {
        {
        }
      } else {
        stryCov_9fa48("1002");
        if (
          stryMutAct_9fa48("1006")
            ? entry.observerCount <= 0
            : stryMutAct_9fa48("1005")
              ? entry.observerCount >= 0
              : stryMutAct_9fa48("1004")
                ? false
                : stryMutAct_9fa48("1003")
                  ? true
                  : (stryCov_9fa48("1003", "1004", "1005", "1006"), entry.observerCount > 0)
        )
          return stryMutAct_9fa48("1007") ? true : (stryCov_9fa48("1007"), false);
        const cacheTime = client.defaults.cacheTime;
        if (
          stryMutAct_9fa48("1010")
            ? entry.dataUpdatedAt !== undefined || Date.now() - entry.dataUpdatedAt > cacheTime
            : stryMutAct_9fa48("1009")
              ? false
              : stryMutAct_9fa48("1008")
                ? true
                : (stryCov_9fa48("1008", "1009", "1010"),
                  (stryMutAct_9fa48("1012")
                    ? entry.dataUpdatedAt === undefined
                    : stryMutAct_9fa48("1011")
                      ? true
                      : (stryCov_9fa48("1011", "1012"), entry.dataUpdatedAt !== undefined)) &&
                    (stryMutAct_9fa48("1015")
                      ? Date.now() - entry.dataUpdatedAt <= cacheTime
                      : stryMutAct_9fa48("1014")
                        ? Date.now() - entry.dataUpdatedAt >= cacheTime
                        : stryMutAct_9fa48("1013")
                          ? true
                          : (stryCov_9fa48("1013", "1014", "1015"),
                            (stryMutAct_9fa48("1016")
                              ? Date.now() + entry.dataUpdatedAt
                              : (stryCov_9fa48("1016"), Date.now() - entry.dataUpdatedAt)) >
                              cacheTime)))
        )
          return stryMutAct_9fa48("1017") ? false : (stryCov_9fa48("1017"), true);
        if (
          stryMutAct_9fa48("1020")
            ? entry.errorUpdatedAt !== undefined || Date.now() - entry.errorUpdatedAt > cacheTime
            : stryMutAct_9fa48("1019")
              ? false
              : stryMutAct_9fa48("1018")
                ? true
                : (stryCov_9fa48("1018", "1019", "1020"),
                  (stryMutAct_9fa48("1022")
                    ? entry.errorUpdatedAt === undefined
                    : stryMutAct_9fa48("1021")
                      ? true
                      : (stryCov_9fa48("1021", "1022"), entry.errorUpdatedAt !== undefined)) &&
                    (stryMutAct_9fa48("1025")
                      ? Date.now() - entry.errorUpdatedAt <= cacheTime
                      : stryMutAct_9fa48("1024")
                        ? Date.now() - entry.errorUpdatedAt >= cacheTime
                        : stryMutAct_9fa48("1023")
                          ? true
                          : (stryCov_9fa48("1023", "1024", "1025"),
                            (stryMutAct_9fa48("1026")
                              ? Date.now() + entry.errorUpdatedAt
                              : (stryCov_9fa48("1026"), Date.now() - entry.errorUpdatedAt)) >
                              cacheTime)))
        )
          return stryMutAct_9fa48("1027") ? false : (stryCov_9fa48("1027"), true);
        return stryMutAct_9fa48("1028") ? true : (stryCov_9fa48("1028"), false);
      }
    }
    return stryMutAct_9fa48("1029")
      ? {}
      : (stryCov_9fa48("1029"),
        {
          getSnapshots(): ReadonlyArray<QuerySnapshot> {
            if (stryMutAct_9fa48("1030")) {
              {
              }
            } else {
              stryCov_9fa48("1030");
              const snapshots: QuerySnapshot[] = stryMutAct_9fa48("1031")
                ? ["Stryker was here"]
                : (stryCov_9fa48("1031"), []);
              const allEntries = cache.getAll();
              const inFlightCount = client.isFetching();
              for (const [, entry] of allEntries) {
                if (stryMutAct_9fa48("1032")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1032");
                  // Find the key for this entry
                  const matched = cache
                    .find(
                      stryMutAct_9fa48("1033")
                        ? () => undefined
                        : (stryCov_9fa48("1033"),
                          (_e, _k) =>
                            stryMutAct_9fa48("1034") ? false : (stryCov_9fa48("1034"), true))
                    )
                    .find(
                      stryMutAct_9fa48("1035")
                        ? () => undefined
                        : (stryCov_9fa48("1035"),
                          ([_k, e]) =>
                            stryMutAct_9fa48("1038")
                              ? e !== entry
                              : stryMutAct_9fa48("1037")
                                ? false
                                : stryMutAct_9fa48("1036")
                                  ? true
                                  : (stryCov_9fa48("1036", "1037", "1038"), e === entry))
                    );
                  if (
                    stryMutAct_9fa48("1040")
                      ? false
                      : stryMutAct_9fa48("1039")
                        ? true
                        : (stryCov_9fa48("1039", "1040"), matched)
                  ) {
                    if (stryMutAct_9fa48("1041")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1041");
                      snapshots.push(
                        stryMutAct_9fa48("1042")
                          ? {}
                          : (stryCov_9fa48("1042"),
                            {
                              key: matched[0],
                              entry,
                              isActive: stryMutAct_9fa48("1046")
                                ? entry.observerCount <= 0
                                : stryMutAct_9fa48("1045")
                                  ? entry.observerCount >= 0
                                  : stryMutAct_9fa48("1044")
                                    ? false
                                    : stryMutAct_9fa48("1043")
                                      ? true
                                      : (stryCov_9fa48("1043", "1044", "1045", "1046"),
                                        entry.observerCount > 0),
                              isStale: isStale(entry),
                              isFetching: stryMutAct_9fa48("1049")
                                ? inFlightCount > 0 || entry.status === "pending"
                                : stryMutAct_9fa48("1048")
                                  ? false
                                  : stryMutAct_9fa48("1047")
                                    ? true
                                    : (stryCov_9fa48("1047", "1048", "1049"),
                                      (stryMutAct_9fa48("1052")
                                        ? inFlightCount <= 0
                                        : stryMutAct_9fa48("1051")
                                          ? inFlightCount >= 0
                                          : stryMutAct_9fa48("1050")
                                            ? true
                                            : (stryCov_9fa48("1050", "1051", "1052"),
                                              inFlightCount > 0)) &&
                                        (stryMutAct_9fa48("1054")
                                          ? entry.status !== "pending"
                                          : stryMutAct_9fa48("1053")
                                            ? true
                                            : (stryCov_9fa48("1053", "1054"),
                                              entry.status ===
                                                (stryMutAct_9fa48("1055")
                                                  ? ""
                                                  : (stryCov_9fa48("1055"), "pending"))))),
                            })
                      );
                    }
                  }
                }
              }
              return snapshots;
            }
          },
          getSnapshot(key: CacheKey): QuerySnapshot | undefined {
            if (stryMutAct_9fa48("1056")) {
              {
              }
            } else {
              stryCov_9fa48("1056");
              const entries = cache.find(
                stryMutAct_9fa48("1057")
                  ? () => undefined
                  : (stryCov_9fa48("1057"),
                    (_, k) =>
                      stryMutAct_9fa48("1060")
                        ? k[0] === key[0] || k[1] === key[1]
                        : stryMutAct_9fa48("1059")
                          ? false
                          : stryMutAct_9fa48("1058")
                            ? true
                            : (stryCov_9fa48("1058", "1059", "1060"),
                              (stryMutAct_9fa48("1062")
                                ? k[0] !== key[0]
                                : stryMutAct_9fa48("1061")
                                  ? true
                                  : (stryCov_9fa48("1061", "1062"), k[0] === key[0])) &&
                                (stryMutAct_9fa48("1064")
                                  ? k[1] !== key[1]
                                  : stryMutAct_9fa48("1063")
                                    ? true
                                    : (stryCov_9fa48("1063", "1064"), k[1] === key[1]))))
              );
              if (
                stryMutAct_9fa48("1067")
                  ? entries.length !== 0
                  : stryMutAct_9fa48("1066")
                    ? false
                    : stryMutAct_9fa48("1065")
                      ? true
                      : (stryCov_9fa48("1065", "1066", "1067"), entries.length === 0)
              )
                return undefined;
              const [foundKey, entry] = entries[0];
              return stryMutAct_9fa48("1068")
                ? {}
                : (stryCov_9fa48("1068"),
                  {
                    key: foundKey,
                    entry,
                    isActive: stryMutAct_9fa48("1072")
                      ? entry.observerCount <= 0
                      : stryMutAct_9fa48("1071")
                        ? entry.observerCount >= 0
                        : stryMutAct_9fa48("1070")
                          ? false
                          : stryMutAct_9fa48("1069")
                            ? true
                            : (stryCov_9fa48("1069", "1070", "1071", "1072"),
                              entry.observerCount > 0),
                    isStale: isStale(entry),
                    isFetching: stryMutAct_9fa48("1073") ? true : (stryCov_9fa48("1073"), false),
                  });
            }
          },
          subscribe(listener: CacheListener): () => void {
            if (stryMutAct_9fa48("1074")) {
              {
              }
            } else {
              stryCov_9fa48("1074");
              return cache.subscribe(listener);
            }
          },
          getStats(): CacheStats {
            if (stryMutAct_9fa48("1075")) {
              {
              }
            } else {
              stryCov_9fa48("1075");
              let total = 0;
              let active = 0;
              let stale = 0;
              let errorCount = 0;
              let gcEligible = 0;
              const allEntries = cache.getAll();
              for (const [, entry] of allEntries) {
                if (stryMutAct_9fa48("1076")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1076");
                  stryMutAct_9fa48("1077") ? total-- : (stryCov_9fa48("1077"), total++);
                  if (
                    stryMutAct_9fa48("1081")
                      ? entry.observerCount <= 0
                      : stryMutAct_9fa48("1080")
                        ? entry.observerCount >= 0
                        : stryMutAct_9fa48("1079")
                          ? false
                          : stryMutAct_9fa48("1078")
                            ? true
                            : (stryCov_9fa48("1078", "1079", "1080", "1081"),
                              entry.observerCount > 0)
                  )
                    stryMutAct_9fa48("1082") ? active-- : (stryCov_9fa48("1082"), active++);
                  if (
                    stryMutAct_9fa48("1084")
                      ? false
                      : stryMutAct_9fa48("1083")
                        ? true
                        : (stryCov_9fa48("1083", "1084"), isStale(entry))
                  )
                    stryMutAct_9fa48("1085") ? stale-- : (stryCov_9fa48("1085"), stale++);
                  if (
                    stryMutAct_9fa48("1088")
                      ? entry.status !== "error"
                      : stryMutAct_9fa48("1087")
                        ? false
                        : stryMutAct_9fa48("1086")
                          ? true
                          : (stryCov_9fa48("1086", "1087", "1088"),
                            entry.status ===
                              (stryMutAct_9fa48("1089") ? "" : (stryCov_9fa48("1089"), "error")))
                  )
                    stryMutAct_9fa48("1090") ? errorCount-- : (stryCov_9fa48("1090"), errorCount++);
                  if (
                    stryMutAct_9fa48("1092")
                      ? false
                      : stryMutAct_9fa48("1091")
                        ? true
                        : (stryCov_9fa48("1091", "1092"), isGcEligible(entry))
                  )
                    stryMutAct_9fa48("1093") ? gcEligible-- : (stryCov_9fa48("1093"), gcEligible++);
                }
              }
              const history = fetchHistory.toArray();
              const totalDuration = history.reduce(
                stryMutAct_9fa48("1094")
                  ? () => undefined
                  : (stryCov_9fa48("1094"),
                    (sum, h) =>
                      stryMutAct_9fa48("1095")
                        ? sum - h.durationMs
                        : (stryCov_9fa48("1095"), sum + h.durationMs)),
                0
              );
              return stryMutAct_9fa48("1096")
                ? {}
                : (stryCov_9fa48("1096"),
                  {
                    totalEntries: total,
                    activeEntries: active,
                    staleEntries: stale,
                    errorEntries: errorCount,
                    inFlightCount: client.isFetching(),
                    cacheHitRate: (
                      stryMutAct_9fa48("1100")
                        ? totalFetchRequests <= 0
                        : stryMutAct_9fa48("1099")
                          ? totalFetchRequests >= 0
                          : stryMutAct_9fa48("1098")
                            ? false
                            : stryMutAct_9fa48("1097")
                              ? true
                              : (stryCov_9fa48("1097", "1098", "1099", "1100"),
                                totalFetchRequests > 0)
                    )
                      ? stryMutAct_9fa48("1101")
                        ? totalCacheHits * totalFetchRequests
                        : (stryCov_9fa48("1101"), totalCacheHits / totalFetchRequests)
                      : 0,
                    avgFetchDurationMs: (
                      stryMutAct_9fa48("1105")
                        ? history.length <= 0
                        : stryMutAct_9fa48("1104")
                          ? history.length >= 0
                          : stryMutAct_9fa48("1103")
                            ? false
                            : stryMutAct_9fa48("1102")
                              ? true
                              : (stryCov_9fa48("1102", "1103", "1104", "1105"), history.length > 0)
                    )
                      ? stryMutAct_9fa48("1106")
                        ? totalDuration * history.length
                        : (stryCov_9fa48("1106"), totalDuration / history.length)
                      : 0,
                    gcEligibleCount: gcEligible,
                  });
            }
          },
          getFetchHistory(filter?: FetchHistoryFilter): ReadonlyArray<FetchHistoryEntry> {
            if (stryMutAct_9fa48("1107")) {
              {
              }
            } else {
              stryCov_9fa48("1107");
              let entries = fetchHistory.toArray();
              if (
                stryMutAct_9fa48("1109")
                  ? false
                  : stryMutAct_9fa48("1108")
                    ? true
                    : (stryCov_9fa48("1108", "1109"), filter)
              ) {
                if (stryMutAct_9fa48("1110")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1110");
                  if (
                    stryMutAct_9fa48("1113")
                      ? filter.portName === undefined
                      : stryMutAct_9fa48("1112")
                        ? false
                        : stryMutAct_9fa48("1111")
                          ? true
                          : (stryCov_9fa48("1111", "1112", "1113"), filter.portName !== undefined)
                  ) {
                    if (stryMutAct_9fa48("1114")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1114");
                      entries = stryMutAct_9fa48("1115")
                        ? entries
                        : (stryCov_9fa48("1115"),
                          entries.filter(
                            stryMutAct_9fa48("1116")
                              ? () => undefined
                              : (stryCov_9fa48("1116"),
                                e =>
                                  stryMutAct_9fa48("1119")
                                    ? e.portName !== filter.portName
                                    : stryMutAct_9fa48("1118")
                                      ? false
                                      : stryMutAct_9fa48("1117")
                                        ? true
                                        : (stryCov_9fa48("1117", "1118", "1119"),
                                          e.portName === filter.portName))
                          ));
                    }
                  }
                  if (
                    stryMutAct_9fa48("1122")
                      ? filter.result === undefined
                      : stryMutAct_9fa48("1121")
                        ? false
                        : stryMutAct_9fa48("1120")
                          ? true
                          : (stryCov_9fa48("1120", "1121", "1122"), filter.result !== undefined)
                  ) {
                    if (stryMutAct_9fa48("1123")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1123");
                      entries = stryMutAct_9fa48("1124")
                        ? entries
                        : (stryCov_9fa48("1124"),
                          entries.filter(
                            stryMutAct_9fa48("1125")
                              ? () => undefined
                              : (stryCov_9fa48("1125"),
                                e =>
                                  stryMutAct_9fa48("1128")
                                    ? e.result !== filter.result
                                    : stryMutAct_9fa48("1127")
                                      ? false
                                      : stryMutAct_9fa48("1126")
                                        ? true
                                        : (stryCov_9fa48("1126", "1127", "1128"),
                                          e.result === filter.result))
                          ));
                    }
                  }
                  if (
                    stryMutAct_9fa48("1131")
                      ? filter.minDurationMs === undefined
                      : stryMutAct_9fa48("1130")
                        ? false
                        : stryMutAct_9fa48("1129")
                          ? true
                          : (stryCov_9fa48("1129", "1130", "1131"),
                            filter.minDurationMs !== undefined)
                  ) {
                    if (stryMutAct_9fa48("1132")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1132");
                      const min = filter.minDurationMs;
                      entries = stryMutAct_9fa48("1133")
                        ? entries
                        : (stryCov_9fa48("1133"),
                          entries.filter(
                            stryMutAct_9fa48("1134")
                              ? () => undefined
                              : (stryCov_9fa48("1134"),
                                e =>
                                  stryMutAct_9fa48("1138")
                                    ? e.durationMs < min
                                    : stryMutAct_9fa48("1137")
                                      ? e.durationMs > min
                                      : stryMutAct_9fa48("1136")
                                        ? false
                                        : stryMutAct_9fa48("1135")
                                          ? true
                                          : (stryCov_9fa48("1135", "1136", "1137", "1138"),
                                            e.durationMs >= min))
                          ));
                    }
                  }
                  if (
                    stryMutAct_9fa48("1141")
                      ? filter.since === undefined
                      : stryMutAct_9fa48("1140")
                        ? false
                        : stryMutAct_9fa48("1139")
                          ? true
                          : (stryCov_9fa48("1139", "1140", "1141"), filter.since !== undefined)
                  ) {
                    if (stryMutAct_9fa48("1142")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1142");
                      const since = filter.since;
                      entries = stryMutAct_9fa48("1143")
                        ? entries
                        : (stryCov_9fa48("1143"),
                          entries.filter(
                            stryMutAct_9fa48("1144")
                              ? () => undefined
                              : (stryCov_9fa48("1144"),
                                e =>
                                  stryMutAct_9fa48("1148")
                                    ? e.timestamp < since
                                    : stryMutAct_9fa48("1147")
                                      ? e.timestamp > since
                                      : stryMutAct_9fa48("1146")
                                        ? false
                                        : stryMutAct_9fa48("1145")
                                          ? true
                                          : (stryCov_9fa48("1145", "1146", "1147", "1148"),
                                            e.timestamp >= since))
                          ));
                    }
                  }
                  if (
                    stryMutAct_9fa48("1151")
                      ? filter.trigger === undefined
                      : stryMutAct_9fa48("1150")
                        ? false
                        : stryMutAct_9fa48("1149")
                          ? true
                          : (stryCov_9fa48("1149", "1150", "1151"), filter.trigger !== undefined)
                  ) {
                    if (stryMutAct_9fa48("1152")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1152");
                      entries = stryMutAct_9fa48("1153")
                        ? entries
                        : (stryCov_9fa48("1153"),
                          entries.filter(
                            stryMutAct_9fa48("1154")
                              ? () => undefined
                              : (stryCov_9fa48("1154"),
                                e =>
                                  stryMutAct_9fa48("1157")
                                    ? e.trigger !== filter.trigger
                                    : stryMutAct_9fa48("1156")
                                      ? false
                                      : stryMutAct_9fa48("1155")
                                        ? true
                                        : (stryCov_9fa48("1155", "1156", "1157"),
                                          e.trigger === filter.trigger))
                          ));
                    }
                  }
                  if (
                    stryMutAct_9fa48("1160")
                      ? filter.limit === undefined
                      : stryMutAct_9fa48("1159")
                        ? false
                        : stryMutAct_9fa48("1158")
                          ? true
                          : (stryCov_9fa48("1158", "1159", "1160"), filter.limit !== undefined)
                  ) {
                    if (stryMutAct_9fa48("1161")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1161");
                      entries = stryMutAct_9fa48("1162")
                        ? entries
                        : (stryCov_9fa48("1162"),
                          entries.slice(
                            stryMutAct_9fa48("1163")
                              ? +filter.limit
                              : (stryCov_9fa48("1163"), -filter.limit)
                          ));
                    }
                  }
                }
              }
              return entries;
            }
          },
          getInvalidationGraph(): InvalidationGraph {
            if (stryMutAct_9fa48("1164")) {
              {
              }
            } else {
              stryCov_9fa48("1164");
              const mutationPorts = client.getRegisteredMutationPorts();
              const queryPorts = client.getRegisteredQueryPorts();
              const nodeSet = new Set<string>();
              const edges: Array<{
                from: string;
                to: string;
                type: "invalidates" | "removes";
              }> = stryMutAct_9fa48("1165") ? ["Stryker was here"] : (stryCov_9fa48("1165"), []);
              const adjacency = new Map<string, string[]>();

              // Add all query ports as nodes
              for (const qp of queryPorts) {
                if (stryMutAct_9fa48("1166")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1166");
                  nodeSet.add(qp);
                }
              }

              // Build edges from mutation port effects
              for (const mp of mutationPorts) {
                if (stryMutAct_9fa48("1167")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1167");
                  nodeSet.add(mp.name);
                  if (
                    stryMutAct_9fa48("1170")
                      ? mp.effects.invalidates
                      : stryMutAct_9fa48("1169")
                        ? false
                        : stryMutAct_9fa48("1168")
                          ? true
                          : (stryCov_9fa48("1168", "1169", "1170"), mp.effects?.invalidates)
                  ) {
                    if (stryMutAct_9fa48("1171")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1171");
                      for (const target of mp.effects.invalidates) {
                        if (stryMutAct_9fa48("1172")) {
                          {
                          }
                        } else {
                          stryCov_9fa48("1172");
                          nodeSet.add(target.__portName);
                          edges.push(
                            stryMutAct_9fa48("1173")
                              ? {}
                              : (stryCov_9fa48("1173"),
                                {
                                  from: mp.name,
                                  to: target.__portName,
                                  type: stryMutAct_9fa48("1174")
                                    ? ""
                                    : (stryCov_9fa48("1174"), "invalidates"),
                                })
                          );
                          const adj = stryMutAct_9fa48("1175")
                            ? adjacency.get(mp.name) && []
                            : (stryCov_9fa48("1175"),
                              adjacency.get(mp.name) ??
                                (stryMutAct_9fa48("1176")
                                  ? ["Stryker was here"]
                                  : (stryCov_9fa48("1176"), [])));
                          adj.push(target.__portName);
                          adjacency.set(mp.name, adj);
                        }
                      }
                    }
                  }
                  if (
                    stryMutAct_9fa48("1179")
                      ? mp.effects.removes
                      : stryMutAct_9fa48("1178")
                        ? false
                        : stryMutAct_9fa48("1177")
                          ? true
                          : (stryCov_9fa48("1177", "1178", "1179"), mp.effects?.removes)
                  ) {
                    if (stryMutAct_9fa48("1180")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1180");
                      for (const target of mp.effects.removes) {
                        if (stryMutAct_9fa48("1181")) {
                          {
                          }
                        } else {
                          stryCov_9fa48("1181");
                          nodeSet.add(target.__portName);
                          edges.push(
                            stryMutAct_9fa48("1182")
                              ? {}
                              : (stryCov_9fa48("1182"),
                                {
                                  from: mp.name,
                                  to: target.__portName,
                                  type: stryMutAct_9fa48("1183")
                                    ? ""
                                    : (stryCov_9fa48("1183"), "removes"),
                                })
                          );
                          const adj = stryMutAct_9fa48("1184")
                            ? adjacency.get(mp.name) && []
                            : (stryCov_9fa48("1184"),
                              adjacency.get(mp.name) ??
                                (stryMutAct_9fa48("1185")
                                  ? ["Stryker was here"]
                                  : (stryCov_9fa48("1185"), [])));
                          adj.push(target.__portName);
                          adjacency.set(mp.name, adj);
                        }
                      }
                    }
                  }
                }
              }
              const nodes = stryMutAct_9fa48("1186") ? [] : (stryCov_9fa48("1186"), [...nodeSet]);
              const cycles = detectCycles(nodes, adjacency);
              const maxCascadeDepth = computeMaxCascadeDepth(adjacency);
              const warnings: string[] = stryMutAct_9fa48("1187")
                ? ["Stryker was here"]
                : (stryCov_9fa48("1187"), []);
              if (
                stryMutAct_9fa48("1191")
                  ? cycles.length <= 0
                  : stryMutAct_9fa48("1190")
                    ? cycles.length >= 0
                    : stryMutAct_9fa48("1189")
                      ? false
                      : stryMutAct_9fa48("1188")
                        ? true
                        : (stryCov_9fa48("1188", "1189", "1190", "1191"), cycles.length > 0)
              ) {
                if (stryMutAct_9fa48("1192")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1192");
                  warnings.push(
                    stryMutAct_9fa48("1193")
                      ? ``
                      : (stryCov_9fa48("1193"), `Detected ${cycles.length} invalidation cycle(s)`)
                  );
                }
              }
              if (
                stryMutAct_9fa48("1197")
                  ? maxCascadeDepth <= 3
                  : stryMutAct_9fa48("1196")
                    ? maxCascadeDepth >= 3
                    : stryMutAct_9fa48("1195")
                      ? false
                      : stryMutAct_9fa48("1194")
                        ? true
                        : (stryCov_9fa48("1194", "1195", "1196", "1197"), maxCascadeDepth > 3)
              ) {
                if (stryMutAct_9fa48("1198")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1198");
                  warnings.push(
                    stryMutAct_9fa48("1199")
                      ? ``
                      : (stryCov_9fa48("1199"),
                        `Deep invalidation cascade detected (depth: ${maxCascadeDepth})`)
                  );
                }
              }
              return stryMutAct_9fa48("1200")
                ? {}
                : (stryCov_9fa48("1200"),
                  {
                    nodes,
                    edges,
                    cycles,
                    maxCascadeDepth,
                    warnings,
                  });
            }
          },
          getDependencyGraph(): QueryDependencyGraph {
            if (stryMutAct_9fa48("1201")) {
              {
              }
            } else {
              stryCov_9fa48("1201");
              // Static edges are not available from client API without port configs
              // Return an empty graph since we don't have direct port config access
              return stryMutAct_9fa48("1202")
                ? {}
                : (stryCov_9fa48("1202"),
                  {
                    staticEdges: stryMutAct_9fa48("1203")
                      ? ["Stryker was here"]
                      : (stryCov_9fa48("1203"), []),
                    dynamicEdges: stryMutAct_9fa48("1204")
                      ? ["Stryker was here"]
                      : (stryCov_9fa48("1204"), []),
                    cycles: stryMutAct_9fa48("1205")
                      ? ["Stryker was here"]
                      : (stryCov_9fa48("1205"), []),
                  });
            }
          },
          getDiagnostics(): QueryDiagnosticSummary {
            if (stryMutAct_9fa48("1206")) {
              {
              }
            } else {
              stryCov_9fa48("1206");
              const stats = this.getStats();
              const history = fetchHistory.toArray();
              const errorFetches = stryMutAct_9fa48("1207")
                ? history.length
                : (stryCov_9fa48("1207"),
                  history.filter(
                    stryMutAct_9fa48("1208")
                      ? () => undefined
                      : (stryCov_9fa48("1208"),
                        h =>
                          stryMutAct_9fa48("1211")
                            ? h.result !== "error"
                            : stryMutAct_9fa48("1210")
                              ? false
                              : stryMutAct_9fa48("1209")
                                ? true
                                : (stryCov_9fa48("1209", "1210", "1211"),
                                  h.result ===
                                    (stryMutAct_9fa48("1212")
                                      ? ""
                                      : (stryCov_9fa48("1212"), "error"))))
                  ).length);
              return stryMutAct_9fa48("1213")
                ? {}
                : (stryCov_9fa48("1213"),
                  {
                    totalQueries: stats.totalEntries,
                    activeQueries: stats.activeEntries,
                    staleQueries: stats.staleEntries,
                    errorQueries: stats.errorEntries,
                    inFlightCount: stats.inFlightCount,
                    cacheHitRate: stats.cacheHitRate,
                    avgFetchDurationMs: stats.avgFetchDurationMs,
                    gcEligibleCount: stats.gcEligibleCount,
                    totalFetches: history.length,
                    errorRate: (
                      stryMutAct_9fa48("1217")
                        ? history.length <= 0
                        : stryMutAct_9fa48("1216")
                          ? history.length >= 0
                          : stryMutAct_9fa48("1215")
                            ? false
                            : stryMutAct_9fa48("1214")
                              ? true
                              : (stryCov_9fa48("1214", "1215", "1216", "1217"), history.length > 0)
                    )
                      ? stryMutAct_9fa48("1218")
                        ? errorFetches * history.length
                        : (stryCov_9fa48("1218"), errorFetches / history.length)
                      : 0,
                  });
            }
          },
          getSuggestions(): ReadonlyArray<QuerySuggestion> {
            if (stryMutAct_9fa48("1219")) {
              {
              }
            } else {
              stryCov_9fa48("1219");
              const suggestions: QuerySuggestion[] = stryMutAct_9fa48("1220")
                ? ["Stryker was here"]
                : (stryCov_9fa48("1220"), []);
              const history = fetchHistory.toArray();

              // Group history by port
              const byPort = new Map<string, FetchHistoryEntry[]>();
              for (const entry of history) {
                if (stryMutAct_9fa48("1221")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1221");
                  const existing = stryMutAct_9fa48("1222")
                    ? byPort.get(entry.portName) && []
                    : (stryCov_9fa48("1222"),
                      byPort.get(entry.portName) ??
                        (stryMutAct_9fa48("1223")
                          ? ["Stryker was here"]
                          : (stryCov_9fa48("1223"), [])));
                  existing.push(entry);
                  byPort.set(entry.portName, existing);
                }
              }
              for (const [portName, portHistory] of byPort) {
                if (stryMutAct_9fa48("1224")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1224");
                  // Check for high error rate
                  const errorCount = stryMutAct_9fa48("1225")
                    ? portHistory.length
                    : (stryCov_9fa48("1225"),
                      portHistory.filter(
                        stryMutAct_9fa48("1226")
                          ? () => undefined
                          : (stryCov_9fa48("1226"),
                            h =>
                              stryMutAct_9fa48("1229")
                                ? h.result !== "error"
                                : stryMutAct_9fa48("1228")
                                  ? false
                                  : stryMutAct_9fa48("1227")
                                    ? true
                                    : (stryCov_9fa48("1227", "1228", "1229"),
                                      h.result ===
                                        (stryMutAct_9fa48("1230")
                                          ? ""
                                          : (stryCov_9fa48("1230"), "error"))))
                      ).length);
                  const errorRate = (
                    stryMutAct_9fa48("1234")
                      ? portHistory.length <= 0
                      : stryMutAct_9fa48("1233")
                        ? portHistory.length >= 0
                        : stryMutAct_9fa48("1232")
                          ? false
                          : stryMutAct_9fa48("1231")
                            ? true
                            : (stryCov_9fa48("1231", "1232", "1233", "1234"),
                              portHistory.length > 0)
                  )
                    ? stryMutAct_9fa48("1235")
                      ? errorCount * portHistory.length
                      : (stryCov_9fa48("1235"), errorCount / portHistory.length)
                    : 0;
                  if (
                    stryMutAct_9fa48("1238")
                      ? errorRate > 0.5 || portHistory.length >= 3
                      : stryMutAct_9fa48("1237")
                        ? false
                        : stryMutAct_9fa48("1236")
                          ? true
                          : (stryCov_9fa48("1236", "1237", "1238"),
                            (stryMutAct_9fa48("1241")
                              ? errorRate <= 0.5
                              : stryMutAct_9fa48("1240")
                                ? errorRate >= 0.5
                                : stryMutAct_9fa48("1239")
                                  ? true
                                  : (stryCov_9fa48("1239", "1240", "1241"), errorRate > 0.5)) &&
                              (stryMutAct_9fa48("1244")
                                ? portHistory.length < 3
                                : stryMutAct_9fa48("1243")
                                  ? portHistory.length > 3
                                  : stryMutAct_9fa48("1242")
                                    ? true
                                    : (stryCov_9fa48("1242", "1243", "1244"),
                                      portHistory.length >= 3)))
                  ) {
                    if (stryMutAct_9fa48("1245")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1245");
                      suggestions.push(
                        stryMutAct_9fa48("1246")
                          ? {}
                          : (stryCov_9fa48("1246"),
                            {
                              type: stryMutAct_9fa48("1247")
                                ? ""
                                : (stryCov_9fa48("1247"), "high_error_rate"),
                              portName,
                              message: stryMutAct_9fa48("1248")
                                ? ``
                                : (stryCov_9fa48("1248"),
                                  `Query "${portName}" has a ${Math.round(stryMutAct_9fa48("1249") ? errorRate / 100 : (stryCov_9fa48("1249"), errorRate * 100))}% error rate (${errorCount}/${portHistory.length} fetches)`),
                              action: stryMutAct_9fa48("1250")
                                ? ""
                                : (stryCov_9fa48("1250"),
                                  "Check the data source or network connectivity. Consider increasing retry count."),
                            })
                      );
                    }
                  }

                  // Check for invalidation storms (many fetches in short window)
                  const recentWindow = 5000; // 5 seconds
                  const now = Date.now();
                  const recentFetches = stryMutAct_9fa48("1251")
                    ? portHistory
                    : (stryCov_9fa48("1251"),
                      portHistory.filter(
                        stryMutAct_9fa48("1252")
                          ? () => undefined
                          : (stryCov_9fa48("1252"),
                            h =>
                              stryMutAct_9fa48("1256")
                                ? now - h.timestamp >= recentWindow
                                : stryMutAct_9fa48("1255")
                                  ? now - h.timestamp <= recentWindow
                                  : stryMutAct_9fa48("1254")
                                    ? false
                                    : stryMutAct_9fa48("1253")
                                      ? true
                                      : (stryCov_9fa48("1253", "1254", "1255", "1256"),
                                        (stryMutAct_9fa48("1257")
                                          ? now + h.timestamp
                                          : (stryCov_9fa48("1257"), now - h.timestamp)) <
                                          recentWindow))
                      ));
                  if (
                    stryMutAct_9fa48("1261")
                      ? recentFetches.length <= 10
                      : stryMutAct_9fa48("1260")
                        ? recentFetches.length >= 10
                        : stryMutAct_9fa48("1259")
                          ? false
                          : stryMutAct_9fa48("1258")
                            ? true
                            : (stryCov_9fa48("1258", "1259", "1260", "1261"),
                              recentFetches.length > 10)
                  ) {
                    if (stryMutAct_9fa48("1262")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1262");
                      suggestions.push(
                        stryMutAct_9fa48("1263")
                          ? {}
                          : (stryCov_9fa48("1263"),
                            {
                              type: stryMutAct_9fa48("1264")
                                ? ""
                                : (stryCov_9fa48("1264"), "invalidation_storm"),
                              portName,
                              message: stryMutAct_9fa48("1265")
                                ? ``
                                : (stryCov_9fa48("1265"),
                                  `Query "${portName}" had ${recentFetches.length} fetches in the last 5 seconds`),
                              action: stryMutAct_9fa48("1266")
                                ? ""
                                : (stryCov_9fa48("1266"),
                                  "Check for unnecessary invalidations or missing deduplication."),
                            })
                      );
                    }
                  }
                }
              }

              // Check for stale queries with observers
              const allEntries = cache.getAll();
              for (const [, entry] of allEntries) {
                if (stryMutAct_9fa48("1267")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1267");
                  if (
                    stryMutAct_9fa48("1270")
                      ? entry.observerCount > 0 || isStale(entry)
                      : stryMutAct_9fa48("1269")
                        ? false
                        : stryMutAct_9fa48("1268")
                          ? true
                          : (stryCov_9fa48("1268", "1269", "1270"),
                            (stryMutAct_9fa48("1273")
                              ? entry.observerCount <= 0
                              : stryMutAct_9fa48("1272")
                                ? entry.observerCount >= 0
                                : stryMutAct_9fa48("1271")
                                  ? true
                                  : (stryCov_9fa48("1271", "1272", "1273"),
                                    entry.observerCount > 0)) && isStale(entry))
                  ) {
                    if (stryMutAct_9fa48("1274")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1274");
                      // Find the port name for this entry
                      const matched = cache
                        .find(
                          stryMutAct_9fa48("1275")
                            ? () => undefined
                            : (stryCov_9fa48("1275"),
                              (_e, _k) =>
                                stryMutAct_9fa48("1276") ? false : (stryCov_9fa48("1276"), true))
                        )
                        .find(
                          stryMutAct_9fa48("1277")
                            ? () => undefined
                            : (stryCov_9fa48("1277"),
                              ([_k, e]) =>
                                stryMutAct_9fa48("1280")
                                  ? e !== entry
                                  : stryMutAct_9fa48("1279")
                                    ? false
                                    : stryMutAct_9fa48("1278")
                                      ? true
                                      : (stryCov_9fa48("1278", "1279", "1280"), e === entry))
                        );
                      if (
                        stryMutAct_9fa48("1282")
                          ? false
                          : stryMutAct_9fa48("1281")
                            ? true
                            : (stryCov_9fa48("1281", "1282"), matched)
                      ) {
                        if (stryMutAct_9fa48("1283")) {
                          {
                          }
                        } else {
                          stryCov_9fa48("1283");
                          const portName = matched[0][0];
                          suggestions.push(
                            stryMutAct_9fa48("1284")
                              ? {}
                              : (stryCov_9fa48("1284"),
                                {
                                  type: stryMutAct_9fa48("1285")
                                    ? ""
                                    : (stryCov_9fa48("1285"), "stale_query"),
                                  portName,
                                  message: stryMutAct_9fa48("1286")
                                    ? ``
                                    : (stryCov_9fa48("1286"),
                                      `Query "${portName}" has ${entry.observerCount} active observer(s) but data is stale`),
                                  action: stryMutAct_9fa48("1287")
                                    ? ""
                                    : (stryCov_9fa48("1287"),
                                      "Consider reducing staleTime or triggering a refetch."),
                                })
                          );
                        }
                      }
                    }
                  }
                }
              }
              return suggestions;
            }
          },
          listQueryPorts(): ReadonlyArray<{
            name: string;
            entryCount: number;
            observerCount: number;
          }> {
            if (stryMutAct_9fa48("1288")) {
              {
              }
            } else {
              stryCov_9fa48("1288");
              const portNames = client.getRegisteredQueryPorts();
              const result: Array<{
                name: string;
                entryCount: number;
                observerCount: number;
              }> = stryMutAct_9fa48("1289") ? ["Stryker was here"] : (stryCov_9fa48("1289"), []);
              for (const name of portNames) {
                if (stryMutAct_9fa48("1290")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1290");
                  const portEntries = cache.find(
                    stryMutAct_9fa48("1291")
                      ? () => undefined
                      : (stryCov_9fa48("1291"),
                        (_entry, key) =>
                          stryMutAct_9fa48("1294")
                            ? key[0] !== name
                            : stryMutAct_9fa48("1293")
                              ? false
                              : stryMutAct_9fa48("1292")
                                ? true
                                : (stryCov_9fa48("1292", "1293", "1294"), key[0] === name))
                  );
                  let totalObservers = 0;
                  for (const [, entry] of portEntries) {
                    if (stryMutAct_9fa48("1295")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1295");
                      stryMutAct_9fa48("1296")
                        ? (totalObservers -= entry.observerCount)
                        : (stryCov_9fa48("1296"), (totalObservers += entry.observerCount));
                    }
                  }
                  result.push(
                    stryMutAct_9fa48("1297")
                      ? {}
                      : (stryCov_9fa48("1297"),
                        {
                          name,
                          entryCount: portEntries.length,
                          observerCount: totalObservers,
                        })
                  );
                }
              }
              return result;
            }
          },
          dispose(): void {
            if (stryMutAct_9fa48("1298")) {
              {
              }
            } else {
              stryCov_9fa48("1298");
              unsubscribeEvents();
            }
          },
        });
  }
}
