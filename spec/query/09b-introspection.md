# 09b - Query Introspection

Query introspection provides runtime visibility into the data fetching layer -- every query's cache state, fetch history, deduplication status, and invalidation events. It follows the same patterns used throughout HexDI: InspectorAPI pattern, Snapshot pattern, Event pattern.

This is the **"reporting" layer** described in VISION.md Phase 3. The query system reports what it knows about the data layer to the central nervous system (the container), making it available for MCP/A2A consumption.

## A. QueryInspectorAPI

```typescript
interface QueryInspectorAPI {
  // === Pull-based (on-demand snapshots) ===

  /** Full snapshot of all query state */
  getSnapshot(): QuerySnapshot;

  /** Snapshot for a specific query */
  getQuerySnapshot<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): QueryEntrySnapshot | undefined;

  /** List all registered query ports with metadata */
  listQueryPorts(): ReadonlyArray<QueryPortInfo>;

  /** Get the invalidation dependency graph (which mutations affect which queries) */
  getInvalidationGraph(): InvalidationGraph;

  /** Get fetch history (recent fetches with timing) */
  getFetchHistory(filter?: FetchHistoryFilter): ReadonlyArray<FetchHistoryEntry>;

  /** Get cache statistics */
  getCacheStats(): CacheStats;

  /** Get query-to-query dependency graph (enabled flag chains) */
  getQueryDependencyGraph(): QueryDependencyGraph;

  /** Get a high-level diagnostic summary of the query system health */
  getDiagnosticSummary(): QueryDiagnosticSummary;

  /** Get actionable suggestions for improving query configuration */
  getQuerySuggestions(): ReadonlyArray<QuerySuggestion>;

  // === Push-based (live subscriptions) ===

  /** Subscribe to all query inspector events */
  subscribe(listener: (event: QueryInspectorEvent) => void): Unsubscribe;
}
```

### Port Definition

```typescript
const QueryInspectorPort = createPort<QueryInspectorAPI>()({
  name: "QueryInspector",
  direction: "outbound",
});

/** The QueryInspector wraps a QueryClient instance directly */
function createQueryInspector(client: QueryClient): QueryInspectorAPI;
```

## B. QuerySnapshot

The full snapshot type captures the complete state of the query system at a point in time:

```typescript
interface QuerySnapshot {
  /** Timestamp of the snapshot */
  readonly timestamp: number;

  /** All cache entries */
  readonly entries: ReadonlyArray<QueryEntrySnapshot>;

  /** In-flight requests */
  readonly inFlight: ReadonlyArray<InFlightSnapshot>;

  /** Cache statistics */
  readonly stats: CacheStats;
}

interface QueryEntrySnapshot {
  readonly kind: "query-entry";
  readonly portName: string;
  readonly params: unknown;
  readonly cacheKey: CacheKey;
  readonly status: QueryStatus;
  readonly fetchStatus: FetchStatus;
  readonly dataUpdatedAt: number | undefined;
  readonly errorUpdatedAt: number | undefined;
  readonly fetchCount: number;
  readonly observerCount: number;
  readonly isInvalidated: boolean;
  readonly isStale: boolean;
  /** Data is included as serializable JSON (may be truncated for large payloads) */
  readonly data: unknown | "[truncated]";
  readonly error: string | null;
  readonly staleTime: number;
  readonly cacheTime: number;
}

interface InFlightSnapshot {
  readonly kind: "in-flight";
  readonly portName: string;
  readonly params: unknown;
  readonly cacheKey: CacheKey;
  readonly startedAt: number;
  readonly elapsedMs: number;
  readonly retryAttempt: number;
}

interface CacheStats {
  readonly totalEntries: number;
  readonly activeEntries: number; // observerCount > 0
  readonly staleEntries: number;
  readonly inFlightCount: number;
  readonly cacheHitRate: number; // hits / (hits + misses) over last N requests
  readonly avgFetchDurationMs: number; // average fetch time over last N requests
  readonly gcEligibleCount: number; // entries eligible for garbage collection
}
```

### QueryDiagnosticSummary

An aggregate health report for the query system. Designed for MCP consumption and
AI-assisted debugging.

```typescript
interface QueryDiagnosticSummary {
  /** Total number of queries registered in the cache */
  readonly totalQueries: number;

  /** Queries with at least one active observer */
  readonly activeQueries: number;

  /** Queries past their staleTime */
  readonly staleQueries: number;

  /** Queries in error state */
  readonly errorQueries: number;

  /** Cache hit rate: hits / (hits + misses) over the measurement window */
  readonly cacheHitRate: number;

  /** Average fetch duration in ms over the measurement window */
  readonly avgFetchDurationMs: number;

  /** Number of currently in-flight fetches */
  readonly pendingFetches: number;

  /** Number of fetches avoided via deduplication */
  readonly dedupSavings: number;

  /** Count of errors grouped by error _tag. */
  readonly errorsByTag: ReadonlyMap<string, number>;
}
```

### QuerySuggestion

Actionable suggestions following the same `{ type, portName, message, action }` shape
as `GraphSuggestion` from `@hex-di/graph` (`packages/graph/src/graph/types/inspection.ts:69-83`).
This ensures ecosystem-wide consistency: MCP consumers process all suggestions with the
same schema, and AI tools can correlate graph-level and query-level suggestions.

```typescript
interface QuerySuggestion {
  /** Category of the suggestion */
  readonly type:
    | "stale_query"
    | "invalidation_storm"
    | "high_error_rate"
    | "unused_observer"
    | "missing_adapter"
    | "large_cache_entry";

  /** The port name this suggestion relates to */
  readonly portName: string;

  /** Human-readable description of the issue */
  readonly message: string;

  /** Suggested action to resolve the issue */
  readonly action: string;
}
```

#### Suggestion Types

| Type                 | Trigger Condition                                         | Example Message                                           | Example Action                                            |
| -------------------- | --------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| `stale_query`        | Query has `staleTime: 0` and refetches > 10/min           | `"Users" refetches 15 times/min with staleTime: 0`        | `Increase staleTime to reduce unnecessary refetches`      |
| `invalidation_storm` | > 5 invalidations of the same port within 1 second        | `"Products" was invalidated 8 times in 1s`                | `Batch invalidations or debounce the triggering mutation` |
| `high_error_rate`    | > 50% of fetches for a port fail over 10+ attempts        | `"PaymentStatus" has 73% error rate (11/15 fetches)`      | `Check adapter implementation or backend health`          |
| `unused_observer`    | Observer count > 0 but no renders consumed data for > 60s | `"Analytics" has 3 observers but data was never read`     | `Remove unused useQuery calls or add enabled: false`      |
| `missing_adapter`    | Query port exists in cache but no adapter is registered   | `"LegacyUsers" has cached data but no registered adapter` | `Register an adapter or remove stale cache entries`       |
| `large_cache_entry`  | Serialized entry size > 1MB                               | `"FullCatalog" cache entry is 4.2MB`                      | `Use pagination or select to reduce cached data size`     |

#### Usage

```typescript
const inspector = createQueryInspector(queryClient);

// Health check
const summary = inspector.getDiagnosticSummary();
console.log(`Cache hit rate: ${(summary.cacheHitRate * 100).toFixed(1)}%`);
console.log(`Dedup savings: ${summary.dedupSavings} avoided fetches`);

// Actionable suggestions
const suggestions = inspector.getQuerySuggestions();
for (const s of suggestions) {
  console.warn(`[${s.type}] ${s.portName}: ${s.message} — ${s.action}`);
}
```

## C. Fetch History

```typescript
interface FetchHistoryEntry {
  readonly portName: string;
  readonly params: unknown;
  readonly cacheKey: CacheKey;
  readonly timestamp: number;
  readonly durationMs: number;
  readonly result: "success" | "error" | "cancelled";
  /** When result is "error", the _tag of the adapter error (if available). */
  readonly errorTag?: string;
  readonly cacheHit: boolean;
  readonly deduplicated: boolean;
  readonly retryAttempt: number;
  readonly error?: string;

  /** What triggered this fetch */
  readonly trigger: FetchTrigger;

  /** Error classification for diagnostics */
  readonly errorKind?: "network" | "timeout" | "server" | "parse" | "abort" | "unknown";

  /** Scope ID if fetched from a scoped container */
  readonly scopeId?: string;

  /** Trace span ID if tracing is active (links to @hex-di/tracing) */
  readonly traceSpanId?: string;
}

type FetchTrigger =
  | "mount" // Component mounted with stale/missing data
  | "refetch-manual" // User called refetch()
  | "refetch-focus" // Window regained focus
  | "refetch-interval" // Polling interval fired
  | "refetch-reconnect" // Network reconnected
  | "invalidation" // queryClient.invalidate() called
  | "mutation-effect" // Mutation effects triggered invalidation
  | "prefetch" // queryClient.prefetch() called
  | "ensure"; // queryClient.ensureQueryData() called

interface FetchHistoryFilter {
  readonly portName?: string;
  readonly result?: "success" | "error" | "cancelled";
  readonly minDurationMs?: number;
  readonly limit?: number;
  readonly since?: number;
  readonly trigger?: FetchTrigger;
  readonly errorKind?: FetchHistoryEntry["errorKind"];
}
```

### Usage

```typescript
const inspector = createQueryInspector(queryClient);

// Get slow queries
const slowQueries = inspector.getFetchHistory({
  minDurationMs: 1000,
  limit: 20,
});

// Get error history for a specific port
const errors = inspector.getFetchHistory({
  portName: "PaymentStatus",
  result: "error",
  since: Date.now() - 3600_000, // last hour
});
```

## D. Cache Dependency Graph

The invalidation graph shows which mutations affect which queries:

```typescript
interface InvalidationGraph {
  /** Nodes: all registered query and mutation ports */
  readonly nodes: ReadonlyArray<{
    readonly name: string;
    readonly type: "query" | "mutation";
  }>;

  /** Edges: mutation -> queries it invalidates/removes */
  readonly edges: ReadonlyArray<{
    readonly from: string; // mutation port name
    readonly to: string; // query port name
    readonly effect: "invalidate" | "remove";
  }>;
}
```

### Example

```typescript
const graph = inspector.getInvalidationGraph();
// {
//   nodes: [
//     { name: "Users", type: "query" },
//     { name: "UserById", type: "query" },
//     { name: "CreateUser", type: "mutation" },
//     { name: "DeleteUser", type: "mutation" },
//   ],
//   edges: [
//     { from: "CreateUser", to: "Users", effect: "invalidate" },
//     { from: "DeleteUser", to: "Users", effect: "invalidate" },
//     { from: "DeleteUser", to: "UserById", effect: "remove" },
//   ],
//   cycles: [],
//   maxCascadeDepth: 1,
//   warnings: [],
// }
```

This graph is derivable from the MutationPort effects declarations. It enables AI tools (via MCP) to answer: "What happens to the cache when CreateUser succeeds?" without reading source code.

### Cycle Detection

The invalidation graph can contain cycles when mutation effects trigger refetches
that trigger further mutations (e.g., via `onSuccess` handlers). The inspector
detects these at analysis time:

```typescript
interface InvalidationGraph {
  readonly nodes: ReadonlyArray<{
    readonly name: string;
    readonly type: "query" | "mutation";
  }>;
  readonly edges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly effect: "invalidate" | "remove";
  }>;
  /** Detected cycles in the invalidation graph */
  readonly cycles: ReadonlyArray<{
    readonly path: readonly string[];
    readonly severity: "warning" | "error";
  }>;
  /** Maximum cascade depth across all mutation paths */
  readonly maxCascadeDepth: number;
  /** Actionable warnings (e.g., "DeleteUser creates 3-deep cascade") */
  readonly warnings: readonly string[];
}
```

### Cycle Severity Detection Algorithm

The inspector classifies cycle severity by analyzing whether a cycle can produce
unbounded invalidation cascades at runtime:

1. **Build the static effect graph.** Collect all mutation port `effects.invalidates`
   and `effects.removes` declarations into a directed graph:
   `Mutation -> [QueryPort1, QueryPort2, ...]`.

2. **Detect strongly connected components (SCCs).** Use Tarjan's algorithm on the
   combined graph of mutations and queries. A cycle exists when a mutation invalidates
   a query whose observer triggers another mutation (via `onSuccess`) that invalidates
   a query already in the path.

3. **Classify each SCC:**
   - **`"error"` severity:** The cycle's total cascade depth exceeds
     `maxInvalidationDepth` (default: 10). This means the cycle will cause a
     a `QueryResolutionError` with `_tag: "QueryInvalidationCycle"` at runtime. Specifically: count the number of
     edges in the longest path within the SCC. If `longestPathLength >= maxInvalidationDepth`,
     the severity is `"error"`.
   - **`"warning"` severity:** The cycle exists but its longest path is shorter than
     `maxInvalidationDepth`. The cycle terminates naturally (e.g., a mutation
     invalidates a query that refetches, but the refetched data does not trigger
     another mutation because the `onSuccess` handler is idempotent or conditional).

4. **Compute `maxCascadeDepth`.** For each mutation node, compute the longest
   invalidation path reachable via BFS/DFS through the effect graph. The maximum
   across all mutations becomes `maxCascadeDepth`.

5. **Generate actionable `warnings`.** For each path with depth > 3, emit a
   human-readable warning string:
   ```
   "DeleteUser -> invalidates Users -> onSuccess triggers RefreshStats -> invalidates DashboardStats (cascade depth: 3)"
   ```

**Note:** Step 2 requires knowledge of `onSuccess` handler behavior, which is
runtime-only. The static analysis is conservative: it assumes any mutation that
invalidates a query _could_ trigger any mutation declared in the same graph.
Actual runtime behavior may be more constrained. The inspector flags potential
cycles; the devtools panel shows which cycles actually fired at runtime via
the `QueryInvalidationCycle` error events.

## E. Tracing Integration

Query fetches emit tracing spans compatible with `@hex-di/tracing`:

```typescript
// Span attributes for a query fetch:
{
  "hex-di.query.port.name": "Users",
  "hex-di.query.params": '{"role":"admin"}',
  "hex-di.query.cache_key": '["Users","{\"role\":\"admin\"}"]',
  "hex-di.query.cache_hit": false,
  "hex-di.query.deduplicated": false,
  "hex-di.query.retry_attempt": 0,
  "hex-di.query.stale_time_ms": 30000,
  "hex-di.query.duration_ms": 142,
  "hex-di.query.result": "success",
}

// Span attributes for a mutation:
{
  "hex-di.mutation.port.name": "CreateUser",
  "hex-di.mutation.duration_ms": 89,
  "hex-di.mutation.result": "success",
  "hex-di.mutation.invalidated_ports": ["Users"],
  "hex-di.mutation.removed_ports": [],
}
```

When `@hex-di/tracing` is present in the graph, query fetches automatically create
child spans under the current resolution span. This provides end-to-end traces from
component render -> container resolve -> query fetch -> cache update.

### How Query Tracing Integrates with Resolution Hooks

The QueryClient does NOT implement its own tracing. Instead, it leverages the existing
`ResolutionHooks` system from `@hex-di/runtime`. When the QueryClient calls
`container.resolve(port)` to get an adapter, the resolution hooks fire automatically.
The QueryClient adds query-specific attributes to its own span layer:

```
Trace hierarchy:
  query:fetch:Users (QueryClient span)
  +-- resolve:UsersPort (resolution hook span, adapter resolution)
  |   +-- resolve:HttpClient (resolution hook span, dependency)
  +-- http:GET /api/users (adapter-internal instrumentation)
```

This means:

1. **No duplicate instrumentation.** Resolution hooks handle DI-level spans.
2. **Query-specific context added separately.** Cache hit, dedup, retry info.
3. **Correlation via trace context.** All spans share the same trace ID.

## F. QueryInspectorEvent

```typescript
type QueryInspectorEvent =
  | {
      readonly kind: "fetch-started";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
      readonly timestamp: number;
    }
  | {
      readonly kind: "fetch-completed";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
      readonly durationMs: number;
      readonly result: "success" | "error";
      readonly errorTag?: string;
    }
  | {
      readonly kind: "fetch-cancelled";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
    }
  | {
      readonly kind: "cache-hit";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
      readonly fresh: boolean;
    }
  | {
      readonly kind: "deduplicated";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
    }
  | {
      readonly kind: "invalidated";
      readonly portName: string;
      readonly params: unknown | undefined;
      readonly source: "manual" | "mutation";
      readonly mutationName?: string;
    }
  | {
      readonly kind: "gc-collected";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
    }
  | {
      readonly kind: "observer-added";
      readonly portName: string;
      readonly params: unknown;
      readonly observerCount: number;
    }
  | {
      readonly kind: "observer-removed";
      readonly portName: string;
      readonly params: unknown;
      readonly observerCount: number;
    }
  | {
      readonly kind: "retry";
      readonly portName: string;
      readonly params: unknown;
      readonly attempt: number;
      readonly delayMs: number;
      readonly error: string;
    }
  | {
      readonly kind: "dependency-cycle-detected";
      readonly path: readonly string[];
      readonly source: "enabled";
      readonly timestamp: number;
    };
```

### MCP Resource Mapping

These events and snapshots map directly to MCP resources for AI consumption:

```
MCP Resource: "hexdi://query/snapshot"      -> inspector.getSnapshot()
MCP Resource: "hexdi://query/history"       -> inspector.getFetchHistory()
MCP Resource: "hexdi://query/invalidation"  -> inspector.getInvalidationGraph()
MCP Resource: "hexdi://query/stats"         -> inspector.getCacheStats()
MCP Resource: "hexdi://query/dependencies"  -> inspector.getQueryDependencyGraph()
MCP Resource: "hexdi://query/diagnostics"   -> inspector.getDiagnosticSummary()
MCP Resource: "hexdi://query/suggestions"   -> inspector.getQuerySuggestions()
MCP Tool:     "hexdi://query/invalidate"    -> queryClient.invalidate(port)
MCP Tool:     "hexdi://query/prefetch"      -> queryClient.prefetch(port, params)
```

---

_Previous: [09 - Query Client](./09-query-client.md)_

_Next: [10 - HexDI Integration](./10-integration.md)_
