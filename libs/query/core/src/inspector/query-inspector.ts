/**
 * QueryInspector - Enhanced introspection API for query cache debugging.
 *
 * Provides fetch history, invalidation graph analysis, dependency graph,
 * diagnostics, and suggestions for the query system.
 *
 * @packageDocumentation
 */

import type { QueryClient, QueryClientEvent, FetchTrigger } from "../client/query-client.js";
import type { CacheListener } from "../cache/query-cache.js";
import type { CacheEntrySnapshot } from "../cache/cache-entry.js";
import { hasSubscribers, getSubscriberCount } from "../cache/cache-entry.js";
import type { CacheKey } from "../cache/cache-key.js";
import { stableStringify } from "../cache/stable-stringify.js";

/**
 * Parse JSON safely, returning `unknown` instead of `any`.
 * Falls back to `undefined` on parse failure.
 */
function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

// =============================================================================
// QuerySnapshot (spec-compliant)
// =============================================================================

export interface QuerySnapshot {
  readonly timestamp: number;
  readonly entries: ReadonlyArray<QueryEntrySnapshot>;
  readonly inFlight: ReadonlyArray<InFlightSnapshot>;
  readonly stats: CacheStats;
}

export interface QueryEntrySnapshot {
  readonly kind: "query-entry";
  readonly portName: string;
  readonly params: unknown;
  readonly cacheKey: CacheKey;
  readonly status: string;
  readonly fetchStatus: "fetching" | "idle";
  readonly dataUpdatedAt: number | undefined;
  readonly errorUpdatedAt: number | undefined;
  readonly fetchCount: number;
  readonly hasSubscribers: boolean;
  readonly isInvalidated: boolean;
  readonly isStale: boolean;
  readonly data: unknown | "[truncated]";
  readonly error: unknown | null;
  readonly staleTime: number;
  readonly cacheTime: number;
}

export interface InFlightSnapshot {
  readonly kind: "in-flight";
  readonly portName: string;
  readonly params: unknown;
  readonly cacheKey: string;
  readonly startedAt: number;
  readonly elapsedMs: number;
  readonly retryAttempt: number;
}

// =============================================================================
// Inspector Event Types
// =============================================================================

export type QueryInspectorEvent =
  | { kind: "fetch-started"; portName: string; params: unknown; timestamp: number }
  | {
      kind: "fetch-completed";
      portName: string;
      params: unknown;
      durationMs: number;
      timestamp: number;
    }
  | { kind: "fetch-cancelled"; portName: string; params: unknown; timestamp: number }
  | { kind: "cache-hit"; portName: string; params: unknown; timestamp: number }
  | { kind: "deduplicated"; portName: string; params: unknown; timestamp: number }
  | { kind: "invalidated"; portName: string; params: unknown; timestamp: number }
  | { kind: "gc-collected"; key: string; timestamp: number }
  | { kind: "subscriber-added"; portName: string; params: unknown; timestamp: number }
  | { kind: "subscriber-removed"; portName: string; params: unknown; timestamp: number }
  | { kind: "retry"; portName: string; params: unknown; attempt: number; timestamp: number }
  | { kind: "dependency-cycle-detected"; chain: readonly string[]; timestamp: number }
  | {
      kind: "mutation-effect-applied";
      mutationPortName: string;
      targetPortName: string;
      effect: "invalidates" | "removes";
      entriesAffected: number;
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
  readonly trigger: FetchTrigger;
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

export interface RuntimeInvalidationEdge {
  readonly from: string;
  readonly to: string;
  readonly effect: "invalidates" | "removes";
  readonly count: number;
  readonly lastTriggered: number;
  readonly totalEntriesAffected: number;
}

export interface InvalidationGraph {
  readonly nodes: ReadonlyArray<string>;
  readonly edges: ReadonlyArray<{ from: string; to: string; type: "invalidates" | "removes" }>;
  readonly runtimeEdges: ReadonlyArray<RuntimeInvalidationEdge>;
  readonly cycles: ReadonlyArray<ReadonlyArray<string>>;
  readonly maxCascadeDepth: number;
  readonly warnings: ReadonlyArray<string>;
}

// =============================================================================
// Dependency Graph
// =============================================================================

export interface QueryDependencyGraph {
  readonly staticEdges: ReadonlyArray<{ from: string; to: string }>;
  readonly dynamicEdges: ReadonlyArray<{ from: string; to: string }>;
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
  readonly dedupSavings: number;
  readonly errorsByTag: ReadonlyMap<string, number>;
}

// =============================================================================
// Suggestions
// =============================================================================

export interface QuerySuggestion {
  readonly type:
    | "stale_query"
    | "invalidation_storm"
    | "high_error_rate"
    | "large_cache_entry"
    | "unused_subscriber"
    | "missing_adapter";
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

export interface MutationPortInfo {
  readonly name: string;
  readonly effects?: {
    readonly invalidates?: ReadonlyArray<{ readonly __portName: string }>;
    readonly removes?: ReadonlyArray<{ readonly __portName: string }>;
  };
}

export interface QueryPortInfo {
  readonly name: string;
  readonly dependsOn?: ReadonlyArray<{ readonly __portName: string }>;
}

export interface QueryInspectorOptions {
  readonly historySize?: number;
  readonly defaultStaleTime?: number;
  /** Mutation port metadata for building the invalidation graph */
  readonly mutationPorts?: ReadonlyArray<MutationPortInfo>;
  /** Query port metadata for building the dependency graph */
  readonly queryPorts?: ReadonlyArray<QueryPortInfo>;
}

export interface QueryInspectorAPI {
  getSnapshot(): QuerySnapshot;
  getQuerySnapshot(
    port: { readonly __portName: string },
    params?: unknown
  ): QueryEntrySnapshot | undefined;
  subscribe(listener: CacheListener): () => void;
  getCacheStats(): CacheStats;
  getFetchHistory(filter?: FetchHistoryFilter): ReadonlyArray<FetchHistoryEntry>;
  getInvalidationGraph(): InvalidationGraph;
  getQueryDependencyGraph(): QueryDependencyGraph;
  getDiagnosticSummary(): QueryDiagnosticSummary;
  getQuerySuggestions(): ReadonlyArray<QuerySuggestion>;
  listQueryPorts(): ReadonlyArray<{ name: string; entryCount: number; subscriberCount: number }>;
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
  const buffer: Array<T | undefined> = Array.from(
    { length: capacity },
    (): T | undefined => undefined
  );
  let writeIndex = 0;
  let count = 0;

  return {
    push(item: T): void {
      buffer[writeIndex] = item;
      writeIndex = (writeIndex + 1) % capacity;
      if (count < capacity) count++;
    },
    toArray(): ReadonlyArray<T> {
      if (count === 0) return [];
      const result: T[] = [];
      const start = count < capacity ? 0 : writeIndex;
      for (let i = 0; i < count; i++) {
        const idx = (start + i) % capacity;
        const item = buffer[idx];
        if (item !== undefined) {
          result.push(item);
        }
      }
      return result;
    },
    get size(): number {
      return count;
    },
  };
}

// =============================================================================
// Internal: Cycle Detection via Iterative DFS
// =============================================================================

function detectCycles(
  nodes: ReadonlyArray<string>,
  adjacency: ReadonlyMap<string, ReadonlyArray<string>>
): ReadonlyArray<ReadonlyArray<string>> {
  const cycles: Array<ReadonlyArray<string>> = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  for (const startNode of nodes) {
    if (visited.has(startNode)) continue;

    // Iterative DFS with explicit stack
    const stack: Array<{ node: string; neighborIdx: number; path: string[] }> = [];
    stack.push({ node: startNode, neighborIdx: 0, path: [startNode] });
    inStack.add(startNode);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const neighbors = adjacency.get(frame.node) ?? [];

      if (frame.neighborIdx >= neighbors.length) {
        // Done with this node
        stack.pop();
        inStack.delete(frame.node);
        visited.add(frame.node);
        continue;
      }

      const neighbor = neighbors[frame.neighborIdx];
      frame.neighborIdx++;

      if (inStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = frame.path.indexOf(neighbor);
        if (cycleStart >= 0) {
          cycles.push([...frame.path.slice(cycleStart), neighbor]);
        }
      } else if (!visited.has(neighbor)) {
        inStack.add(neighbor);
        stack.push({ node: neighbor, neighborIdx: 0, path: [...frame.path, neighbor] });
      }
    }
  }

  return cycles;
}

// =============================================================================
// Internal: Compute Max Cascade Depth
// =============================================================================

function computeMaxCascadeDepth(adjacency: ReadonlyMap<string, ReadonlyArray<string>>): number {
  let maxDepth = 0;
  const memo = new Map<string, number>();

  function dfs(node: string, visited: Set<string>): number {
    if (memo.has(node)) return memo.get(node) ?? 0;
    if (visited.has(node)) return 0; // cycle -- stop

    visited.add(node);
    const neighbors = adjacency.get(node) ?? [];
    let depth = 0;
    for (const neighbor of neighbors) {
      depth = Math.max(depth, 1 + dfs(neighbor, visited));
    }
    visited.delete(node);
    memo.set(node, depth);
    return depth;
  }

  for (const node of adjacency.keys()) {
    maxDepth = Math.max(maxDepth, dfs(node, new Set()));
  }

  return maxDepth;
}

// =============================================================================
// createQueryInspector Factory
// =============================================================================

export function createQueryInspector(
  client: QueryClient,
  options?: QueryInspectorOptions
): QueryInspectorAPI {
  const historySize = options?.historySize ?? 1000;
  const defaultStaleTime = options?.defaultStaleTime ?? client.defaults.staleTime;
  const cache = client.cache;

  // Fetch history ring buffer
  const fetchHistory = createRingBuffer<FetchHistoryEntry>(historySize);

  // Track pending fetches for duration calculation
  const pendingFetches = new Map<
    string,
    { timestamp: number; retryAttempt: number; trigger: FetchTrigger }
  >();

  // Track cache hits and deduplication for current fetches
  const recentCacheHits = new Set<string>();
  const recentDeduplicated = new Set<string>();

  // Counters for hit rate
  let totalFetchRequests = 0;
  let totalCacheHits = 0;

  // Counter for deduplication savings
  let totalDedupSavings = 0;

  // Counter for errors by tag
  const errorCountsByTag = new Map<string, number>();

  // Runtime invalidation tracking: key = "mutationPort→queryPort→effect"
  const runtimeInvalidations = new Map<
    string,
    { count: number; lastTriggered: number; totalEntriesAffected: number }
  >();

  // Subscribe to client events to build fetch history
  const unsubscribeEvents = client.subscribeToEvents((event: QueryClientEvent) => {
    // mutation-effect-applied uses different field names; skip eventKey for it
    const eventKey =
      event.type !== "mutation-effect-applied"
        ? `${event.portName}:${JSON.stringify("params" in event ? event.params : undefined)}`
        : "";

    switch (event.type) {
      case "fetch-started": {
        totalFetchRequests++;
        pendingFetches.set(eventKey, {
          timestamp: Date.now(),
          retryAttempt: 0,
          trigger: event.trigger,
        });
        break;
      }
      case "fetch-completed": {
        const pending = pendingFetches.get(eventKey);
        pendingFetches.delete(eventKey);
        const wasCacheHit = recentCacheHits.has(eventKey);
        const wasDeduplicated = recentDeduplicated.has(eventKey);
        recentCacheHits.delete(eventKey);
        recentDeduplicated.delete(eventKey);

        fetchHistory.push({
          portName: event.portName,
          params: event.params,
          cacheKey: eventKey,
          timestamp: pending?.timestamp ?? Date.now(),
          durationMs: event.durationMs,
          result: "ok",
          cacheHit: wasCacheHit,
          deduplicated: wasDeduplicated,
          retryAttempt: pending?.retryAttempt ?? 0,
          trigger: pending?.trigger ?? "refetch-manual",
        });
        break;
      }
      case "fetch-error": {
        const pendingErr = pendingFetches.get(eventKey);
        pendingFetches.delete(eventKey);
        const wasCacheHitErr = recentCacheHits.has(eventKey);
        const wasDeduplicatedErr = recentDeduplicated.has(eventKey);
        recentCacheHits.delete(eventKey);
        recentDeduplicated.delete(eventKey);

        if (event.errorTag) {
          errorCountsByTag.set(event.errorTag, (errorCountsByTag.get(event.errorTag) ?? 0) + 1);
        }

        fetchHistory.push({
          portName: event.portName,
          params: event.params,
          cacheKey: eventKey,
          timestamp: pendingErr?.timestamp ?? Date.now(),
          durationMs: event.durationMs,
          result: "error",
          errorTag: event.errorTag,
          cacheHit: wasCacheHitErr,
          deduplicated: wasDeduplicatedErr,
          retryAttempt: pendingErr?.retryAttempt ?? 0,
          trigger: pendingErr?.trigger ?? "refetch-manual",
        });
        break;
      }
      case "fetch-cancelled": {
        pendingFetches.delete(eventKey);
        recentCacheHits.delete(eventKey);
        recentDeduplicated.delete(eventKey);
        break;
      }
      case "cache-hit": {
        totalCacheHits++;
        recentCacheHits.add(eventKey);
        break;
      }
      case "deduplicated": {
        totalDedupSavings++;
        recentDeduplicated.add(eventKey);
        break;
      }
      case "retry": {
        const pending = pendingFetches.get(eventKey);
        if (pending) {
          pending.retryAttempt = event.attempt;
        }
        break;
      }
      case "mutation-effect-applied": {
        const runtimeKey = `${event.mutationPortName}→${event.targetPortName}→${event.effect}`;
        const existing = runtimeInvalidations.get(runtimeKey);
        if (existing) {
          existing.count++;
          existing.lastTriggered = Date.now();
          existing.totalEntriesAffected += event.entriesAffected;
        } else {
          runtimeInvalidations.set(runtimeKey, {
            count: 1,
            lastTriggered: Date.now(),
            totalEntriesAffected: event.entriesAffected,
          });
        }
        break;
      }
      case "invalidated":
      case "observer-added":
      case "observer-removed":
      case "mutation-started":
      case "mutation-completed":
        // These events don't directly contribute to fetch history
        break;
    }
  });

  function isStale(entry: CacheEntrySnapshot): boolean {
    if (entry.isInvalidated) return true;
    if (entry.dataUpdatedAt === undefined) return true;
    return Date.now() - entry.dataUpdatedAt > defaultStaleTime;
  }

  function isGcEligible(entry: CacheEntrySnapshot): boolean {
    // GC eligibility is determined by subscriber count at the reactive entry level.
    // Since we work with snapshots here, we check via the cache's reactive entries.
    const cacheTime = client.defaults.cacheTime;
    if (entry.dataUpdatedAt !== undefined && Date.now() - entry.dataUpdatedAt > cacheTime)
      return true;
    if (entry.errorUpdatedAt !== undefined && Date.now() - entry.errorUpdatedAt > cacheTime)
      return true;
    return false;
  }

  const DATA_TRUNCATION_THRESHOLD = 100_000;

  function buildEntrySnapshot(key: CacheKey, entry: CacheEntrySnapshot): QueryEntrySnapshot {
    const isFetchingNow = pendingFetches.has(`${key[0]}:${key[1]}`);
    let data: unknown | "[truncated]" = entry.data;
    if (data !== undefined) {
      const serialized = stableStringify(data);
      if (serialized.length > DATA_TRUNCATION_THRESHOLD) {
        data = "[truncated]";
      }
    }

    // Check subscriber status via reactive entry
    const reactiveEntry = cache.getEntry({ __portName: key[0] }, parseJsonSafe(key[1]));
    const entryHasSubscribers = reactiveEntry !== undefined && hasSubscribers(reactiveEntry);

    return {
      kind: "query-entry",
      portName: key[0],
      params: key[1] !== undefined ? parseJsonSafe(key[1]) : undefined,
      cacheKey: key,
      status: entry.status,
      fetchStatus: isFetchingNow ? "fetching" : "idle",
      dataUpdatedAt: entry.dataUpdatedAt,
      errorUpdatedAt: entry.errorUpdatedAt,
      fetchCount: entry.fetchCount,
      hasSubscribers: entryHasSubscribers,
      isInvalidated: entry.isInvalidated,
      isStale: isStale(entry),
      data,
      error: entry.error,
      staleTime: defaultStaleTime,
      cacheTime: client.defaults.cacheTime,
    };
  }

  return {
    getSnapshot(): QuerySnapshot {
      const entries: QueryEntrySnapshot[] = [];
      const allCacheEntries = cache.find(() => true);

      for (const [key, entry] of allCacheEntries) {
        entries.push(buildEntrySnapshot(key, entry));
      }

      // Build in-flight snapshots from pendingFetches
      const inFlight: InFlightSnapshot[] = [];
      const now = Date.now();
      for (const [eventKey, pending] of pendingFetches) {
        const separatorIdx = eventKey.indexOf(":");
        const portName = eventKey.substring(0, separatorIdx);
        const paramsStr = eventKey.substring(separatorIdx + 1);
        inFlight.push({
          kind: "in-flight",
          portName,
          params: parseJsonSafe(paramsStr),
          cacheKey: eventKey,
          startedAt: pending.timestamp,
          elapsedMs: now - pending.timestamp,
          retryAttempt: pending.retryAttempt,
        });
      }

      return {
        timestamp: now,
        entries,
        inFlight,
        stats: this.getCacheStats(),
      };
    },

    getQuerySnapshot(
      port: { readonly __portName: string },
      params?: unknown
    ): QueryEntrySnapshot | undefined {
      const portEntries = cache.find((_entry, k) => k[0] === port.__portName);
      if (portEntries.length === 0) return undefined;

      if (params !== undefined) {
        const paramStr = JSON.stringify(params);
        const match = portEntries.find(([k]) => k[1] === paramStr);
        if (!match) return undefined;
        return buildEntrySnapshot(match[0], match[1]);
      }

      const [key, entry] = portEntries[0];
      return buildEntrySnapshot(key, entry);
    },

    subscribe(listener: CacheListener): () => void {
      return cache.subscribe(listener);
    },

    getCacheStats(): CacheStats {
      let total = 0;
      let active = 0;
      let stale = 0;
      let errorCount = 0;
      let gcEligible = 0;

      const allCacheEntries = cache.find(() => true);
      for (const [key, entry] of allCacheEntries) {
        total++;
        const params = parseJsonSafe(key[1]);
        const reactiveEntry = cache.getEntry({ __portName: key[0] }, params);
        const entryHasSubs = reactiveEntry !== undefined && hasSubscribers(reactiveEntry);
        if (entryHasSubs) active++;
        if (isStale(entry)) stale++;
        if (entry.status === "error") errorCount++;
        // GC eligibility: must not have subscribers AND must be expired
        if (!entryHasSubs && isGcEligible(entry)) gcEligible++;
      }

      const history = fetchHistory.toArray();
      const totalDuration = history.reduce((sum, h) => sum + h.durationMs, 0);

      return {
        totalEntries: total,
        activeEntries: active,
        staleEntries: stale,
        errorEntries: errorCount,
        inFlightCount: client.isFetching(),
        cacheHitRate: totalFetchRequests > 0 ? totalCacheHits / totalFetchRequests : 0,
        avgFetchDurationMs: history.length > 0 ? totalDuration / history.length : 0,
        gcEligibleCount: gcEligible,
      };
    },

    getFetchHistory(filter?: FetchHistoryFilter): ReadonlyArray<FetchHistoryEntry> {
      let entries = fetchHistory.toArray();

      if (filter) {
        if (filter.portName !== undefined) {
          entries = entries.filter(e => e.portName === filter.portName);
        }
        if (filter.result !== undefined) {
          entries = entries.filter(e => e.result === filter.result);
        }
        if (filter.minDurationMs !== undefined) {
          const min = filter.minDurationMs;
          entries = entries.filter(e => e.durationMs >= min);
        }
        if (filter.since !== undefined) {
          const since = filter.since;
          entries = entries.filter(e => e.timestamp >= since);
        }
        if (filter.trigger !== undefined) {
          entries = entries.filter(e => e.trigger === filter.trigger);
        }
        if (filter.limit !== undefined) {
          entries = entries.slice(-filter.limit);
        }
      }

      return entries;
    },

    getInvalidationGraph(): InvalidationGraph {
      // Derive query port names from cache entries
      const allEntries = cache.find(() => true);
      const nodeSet = new Set<string>();
      for (const [key] of allEntries) {
        nodeSet.add(key[0]);
      }

      const edges: Array<{ from: string; to: string; type: "invalidates" | "removes" }> = [];
      const adjacency = new Map<string, string[]>();

      // Mutation port effects are available via subscribeToEvents
      // and will be wired through the container inspector in Phase 5.
      // For now, we derive what we can from the registered mutation ports
      // passed via inspector options.
      for (const mp of options?.mutationPorts ?? []) {
        nodeSet.add(mp.name);
        if (mp.effects?.invalidates) {
          for (const target of mp.effects.invalidates) {
            nodeSet.add(target.__portName);
            edges.push({ from: mp.name, to: target.__portName, type: "invalidates" });
            const adj = adjacency.get(mp.name) ?? [];
            adj.push(target.__portName);
            adjacency.set(mp.name, adj);
          }
        }
        if (mp.effects?.removes) {
          for (const target of mp.effects.removes) {
            nodeSet.add(target.__portName);
            edges.push({ from: mp.name, to: target.__portName, type: "removes" });
            const adj = adjacency.get(mp.name) ?? [];
            adj.push(target.__portName);
            adjacency.set(mp.name, adj);
          }
        }
      }

      // Build runtime edges from tracked invalidation events
      const runtimeEdges: RuntimeInvalidationEdge[] = [];
      const staticEdgeKeys = new Set(edges.map(e => `${e.from}→${e.to}→${e.type}`));

      for (const [key, tracking] of runtimeInvalidations) {
        const [from, to, effect] = key.split("→");
        nodeSet.add(from);
        nodeSet.add(to);
        runtimeEdges.push({
          from,
          to,
          effect: effect === "removes" ? "removes" : "invalidates",
          count: tracking.count,
          lastTriggered: tracking.lastTriggered,
          totalEntriesAffected: tracking.totalEntriesAffected,
        });

        // Merge runtime edges into adjacency for cycle detection
        if (!adjacency.has(from)) {
          adjacency.set(from, []);
        }
        const adj = adjacency.get(from);
        if (adj && !adj.includes(to)) {
          adj.push(to);
        }
      }

      const nodes = [...nodeSet];
      const cycles = detectCycles(nodes, adjacency);
      const maxCascadeDepth = computeMaxCascadeDepth(adjacency);

      const warnings: string[] = [];
      if (cycles.length > 0) {
        warnings.push(`Detected ${cycles.length} invalidation cycle(s)`);
      }
      if (maxCascadeDepth > 3) {
        warnings.push(`Deep invalidation cascade detected (depth: ${maxCascadeDepth})`);
      }

      // Warn about runtime-only edges (observed at runtime but not declared in static config)
      for (const [key] of runtimeInvalidations) {
        if (!staticEdgeKeys.has(key)) {
          const [from, to, effect] = key.split("→");
          warnings.push(
            `Runtime-only edge: ${from} --${effect}--> ${to} (not declared in static config)`
          );
        }
      }

      return {
        nodes,
        edges,
        runtimeEdges,
        cycles,
        maxCascadeDepth,
        warnings,
      };
    },

    getQueryDependencyGraph(): QueryDependencyGraph {
      const staticEdges: Array<{ from: string; to: string }> = [];
      const adjacency = new Map<string, string[]>();
      const nodeSet = new Set<string>();

      for (const qp of options?.queryPorts ?? []) {
        nodeSet.add(qp.name);
        if (qp.dependsOn) {
          for (const dep of qp.dependsOn) {
            nodeSet.add(dep.__portName);
            staticEdges.push({ from: qp.name, to: dep.__portName });
            const adj = adjacency.get(qp.name) ?? [];
            adj.push(dep.__portName);
            adjacency.set(qp.name, adj);
          }
        }
      }

      const nodes = [...nodeSet];
      const cycles = detectCycles(nodes, adjacency);

      return {
        staticEdges,
        dynamicEdges: [],
        cycles,
      };
    },

    getDiagnosticSummary(): QueryDiagnosticSummary {
      const stats = this.getCacheStats();
      const history = fetchHistory.toArray();
      const errorFetches = history.filter(h => h.result === "error").length;

      return {
        totalQueries: stats.totalEntries,
        activeQueries: stats.activeEntries,
        staleQueries: stats.staleEntries,
        errorQueries: stats.errorEntries,
        inFlightCount: stats.inFlightCount,
        cacheHitRate: stats.cacheHitRate,
        avgFetchDurationMs: stats.avgFetchDurationMs,
        gcEligibleCount: stats.gcEligibleCount,
        totalFetches: history.length,
        errorRate: history.length > 0 ? errorFetches / history.length : 0,
        dedupSavings: totalDedupSavings,
        errorsByTag: new Map(errorCountsByTag),
      };
    },

    getQuerySuggestions(): ReadonlyArray<QuerySuggestion> {
      const suggestions: QuerySuggestion[] = [];
      const history = fetchHistory.toArray();

      // Group history by port
      const byPort = new Map<string, FetchHistoryEntry[]>();
      for (const entry of history) {
        const existing = byPort.get(entry.portName) ?? [];
        existing.push(entry);
        byPort.set(entry.portName, existing);
      }

      for (const [portName, portHistory] of byPort) {
        // Check for high error rate
        const errorCount = portHistory.filter(h => h.result === "error").length;
        const errorRate = portHistory.length > 0 ? errorCount / portHistory.length : 0;
        if (errorRate > 0.5 && portHistory.length >= 3) {
          suggestions.push({
            type: "high_error_rate",
            portName,
            message: `Query "${portName}" has a ${Math.round(errorRate * 100)}% error rate (${errorCount}/${portHistory.length} fetches)`,
            action:
              "Check the data source or network connectivity. Consider increasing retry count.",
          });
        }

        // Check for invalidation storms (many fetches in short window)
        const recentWindow = 5000; // 5 seconds
        const now = Date.now();
        const recentFetches = portHistory.filter(h => now - h.timestamp < recentWindow);
        if (recentFetches.length > 10) {
          suggestions.push({
            type: "invalidation_storm",
            portName,
            message: `Query "${portName}" had ${recentFetches.length} fetches in the last 5 seconds`,
            action: "Check for unnecessary invalidations or missing deduplication.",
          });
        }
      }

      // Check for stale queries with subscribers, large cache entries, and unused subscribers
      const allCacheEntries2 = cache.find(() => true);
      for (const [key, entry] of allCacheEntries2) {
        const portName = key[0];
        const params = parseJsonSafe(key[1]);
        const reactiveEntry = cache.getEntry({ __portName: portName }, params);
        const entryHasSubscribers = reactiveEntry !== undefined && hasSubscribers(reactiveEntry);

        if (entryHasSubscribers && isStale(entry)) {
          suggestions.push({
            type: "stale_query",
            portName,
            message: `Query "${portName}" has active subscriber(s) but data is stale`,
            action: "Consider reducing staleTime or triggering a refetch.",
          });
        }

        // large_cache_entry: detect entries where serialized data > 1MB
        if (entry.data !== undefined) {
          const serialized = stableStringify(entry.data);
          if (serialized.length > 1_000_000) {
            const sizeMb = (serialized.length / 1_000_000).toFixed(1);
            suggestions.push({
              type: "large_cache_entry",
              portName,
              message: `Query "${portName}" cache entry is ${sizeMb}MB`,
              action: "Use pagination or select to reduce cached data size.",
            });
          }
        }

        // unused_subscriber: subscriber attached but never fetched
        if (entryHasSubscribers && entry.fetchCount === 0) {
          suggestions.push({
            type: "unused_subscriber",
            portName,
            message: `Query "${portName}" has active subscriber(s) but data was never fetched`,
            action: "Remove unused useQuery calls or add enabled: false.",
          });
        }
      }

      // missing_adapter: detect adapter-missing errors in fetch history
      const adapterMissingPorts = new Set<string>();
      for (const entry of history) {
        if (entry.errorTag === "QueryAdapterMissing" && !adapterMissingPorts.has(entry.portName)) {
          adapterMissingPorts.add(entry.portName);
          suggestions.push({
            type: "missing_adapter",
            portName: entry.portName,
            message: `Query "${entry.portName}" has cached data but no registered adapter`,
            action: "Register an adapter or remove stale cache entries.",
          });
        }
      }

      return suggestions;
    },

    listQueryPorts(): ReadonlyArray<{ name: string; entryCount: number; subscriberCount: number }> {
      // Derive port names from cache entries
      const allEntries = cache.find(() => true);
      const portNameSet = new Set<string>();
      for (const [key] of allEntries) {
        portNameSet.add(key[0]);
      }
      const portNames = [...portNameSet];
      const result: Array<{ name: string; entryCount: number; subscriberCount: number }> = [];

      for (const name of portNames) {
        const portEntries = cache.find((_entry, key) => key[0] === name);
        let totalSubscribers = 0;
        for (const [key] of portEntries) {
          const params = parseJsonSafe(key[1]);
          const reactiveEntry = cache.getEntry({ __portName: name }, params);
          if (reactiveEntry) {
            totalSubscribers += getSubscriberCount(reactiveEntry);
          }
        }
        result.push({
          name,
          entryCount: portEntries.length,
          subscriberCount: totalSubscribers,
        });
      }

      return result;
    },

    dispose(): void {
      unsubscribeEvents();
    },
  };
}
