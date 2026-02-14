# GxP Compliance Analysis Report: @hex-di/query

**Package:** `@hex-di/query` (core, react, testing)
**Analysis Date:** 2026-02-10
**Analyst:** Automated GxP Compliance Review
**Score:** 7.5 / 10

---

## 1. Executive Summary

The `@hex-di/query` library is a DI-integrated data fetching and caching system comprising 48 source files across three sub-packages (`core`, `react`, `testing`) totaling approximately 21,756 lines of source code. It provides reactive query state management with signal-backed cache entries, request deduplication, exponential backoff retry, structural sharing, SSR hydration/dehydration, and optional distributed tracing.

**Overall GxP Readiness Score: 7.5 / 10**

**Strengths:**

- Deterministic cache key generation via `stableStringify()` with lexicographic key sorting
- Comprehensive 7-variant `QueryResolutionError` tagged union with full attribution
- Request deduplication with automatic settlement cleanup
- Exponential backoff retry with configurable delay: `Math.min(1000 * 2^attempt, 30_000)`
- Structural sharing via `replaceEqualDeep()` preserving referential stability
- 82 test files across core (45), react (27), and testing (10) packages
- Compile-time validators for circular dependencies, missing ports, and captive dependency detection
- Comprehensive inspector API with fetch history, invalidation graph analysis, and diagnostic suggestions

**Weaknesses:**

- No response schema validation -- fetched data is accepted as-is from adapters
- No mandatory audit trail -- tracing integration is opt-in via `QueryTracingHook`
- No cache encryption -- data persisted to storage backends is unencrypted
- Dehydration versioning uses `version: 3` but provides no migration path for v1 or v2
- No request/response signing or integrity verification

---

## 2. Package Overview

### Architecture

```
libs/query/
  core/src/
    adapters/       -- Adapter bridges (query, mutation, streamed)
    cache/          -- QueryCache, CacheEntry, CacheKey, retry, structural sharing, stable-stringify
    client/         -- QueryClient, QueryObserver, MutationObserver, deduplication, dehydration
    inspector/      -- QueryInspector with fetch history, invalidation graph, diagnostics
    integration/    -- LibraryInspector bridge to container's unified inspection protocol
    persistence/    -- CachePersister interface and PersistenceManager
    ports/          -- QueryPort, MutationPort factory definitions with type guards
    reactivity/     -- Signal primitives, computed, effects, batching, isolated reactive systems
    tracing/        -- QueryTracingHook, TracerLike interface, tracing bridge
    types/          -- Errors, options, state, validators, utilities
  react/src/        -- React hooks (useQuery, useMutation, useQueries, useSuspenseQuery, etc.)
  testing/src/      -- Test utilities (mock adapters, spy adapters, assertions, test containers)
```

### Key Metrics

| Metric                  | Value                                                                      |
| ----------------------- | -------------------------------------------------------------------------- |
| Source files (core)     | 48                                                                         |
| Total source lines      | ~21,756                                                                    |
| Test files              | 82                                                                         |
| Error variants          | 7 (QueryResolutionError tagged union)                                      |
| Cache event types       | 5 (added, updated, removed, invalidated, cleared)                          |
| Client event types      | 13 (fetch-started, fetch-completed, etc.)                                  |
| QueryClient API methods | 22                                                                         |
| Compile-time validators | 5 (circular deps, missing ports, mutation effects, lifetime, reachability) |

### Dependencies

- `@hex-di/core` -- Port and adapter constraint types
- `@hex-di/result` -- `Result<T, E>` / `ResultAsync<T, E>` monadic error handling
- `alien-signals` -- Fine-grained reactive primitives (signals, computed, effects)

---

## 3. GxP Compliance Matrix

| #   | Criterion                           | Score | Status              |
| --- | ----------------------------------- | ----- | ------------------- |
| 1   | Data Integrity (ALCOA+)             | 8/10  | Compliant with gaps |
| 2   | Traceability & Audit Trail          | 7/10  | Opt-in only         |
| 3   | Determinism & Reproducibility       | 9/10  | Strong              |
| 4   | Error Handling & Recovery           | 9/10  | Strong              |
| 5   | Validation & Input Verification     | 5/10  | Significant gap     |
| 6   | Change Control & Versioning         | 7/10  | Partial             |
| 7   | Testing & Verification              | 9/10  | Strong              |
| 8   | Security                            | 5/10  | Significant gaps    |
| 9   | Documentation                       | 8/10  | Good                |
| 10  | Compliance-Specific (Data Fetching) | 8/10  | Strong              |

---

## 4. Detailed Analysis

### 4.1 Data Integrity (ALCOA+) -- Score: 8/10

**Attributable:** Every cache entry tracks `dataUpdatedAt` and `errorUpdatedAt` timestamps via dedicated signals. The `QueryClientEvent` system records which port and params produced each fetch, providing attribution to the data source.

**Legible:** Cache entries use a well-defined `CacheEntrySnapshot` interface with explicit fields. The `QueryInspector` truncates entries exceeding 100KB for display while preserving the underlying data.

**Contemporaneous:** Timestamps are recorded at mutation time using an injectable `Clock` interface, enabling deterministic testing.

From `cache/query-cache.ts` (lines 312-316):

```typescript
// Write to source signals
entry.result$.set(ok(finalData));
entry.dataUpdatedAt$.set(clock.now());
entry.fetchCount$.set(entry.fetchCount$.peek() + 1);
entry.isInvalidated$.set(false);
```

**Original:** Structural sharing via `replaceEqualDeep()` preserves previous references for unchanged sub-trees, but the original data from the adapter is always stored. The `Result<TData, TError>` wrapper distinguishes success from error unambiguously.

**Accurate:** The `stableStringify()` function ensures deterministic serialization, and branded `CacheKey` types prevent ad-hoc key construction.

**Gap:** No runtime validation that adapter-returned data matches the declared `TData` type. TypeScript generics provide compile-time safety, but runtime payloads are trusted without schema verification.

### 4.2 Traceability & Audit Trail -- Score: 7/10

The library provides two complementary tracing mechanisms:

**QueryClientEvent system (always available):** 13 event types emitted through `subscribeToEvents()`:

From `client/query-client.ts` (lines 214-263):

```typescript
export type QueryClientEvent =
  | {
      readonly type: "fetch-started";
      readonly portName: string;
      readonly params: unknown;
      readonly trigger: FetchTrigger;
    }
  | {
      readonly type: "fetch-completed";
      readonly portName: string;
      readonly params: unknown;
      readonly durationMs: number;
    }
  | {
      readonly type: "fetch-error";
      readonly portName: string;
      readonly params: unknown;
      readonly durationMs: number;
      readonly errorTag?: string;
    }
  | { readonly type: "fetch-cancelled"; readonly portName: string; readonly params: unknown }
  | { readonly type: "cache-hit"; readonly portName: string; readonly params: unknown }
  | { readonly type: "deduplicated"; readonly portName: string; readonly params: unknown }
  | {
      readonly type: "invalidated";
      readonly portName: string;
      readonly params: unknown | undefined;
    };
// ... plus observer-added, observer-removed, retry, mutation-started, mutation-completed, mutation-effect-applied
```

**QueryTracingHook (opt-in):** Distributed tracing integration via a `TracerLike` interface that bridges to any tracing backend (Datadog, Zipkin, etc.) without direct dependency:

From `tracing/types.ts` (lines 22-25):

```typescript
export interface TracerLike {
  pushSpan(name: string, attributes?: Record<string, string>): void;
  popSpan(status: "ok" | "error"): void;
}
```

**QueryInspector:** Comprehensive introspection with ring-buffered fetch history (default 1000 entries), invalidation graph analysis, and diagnostic summaries.

**Gap:** Tracing is opt-in. Without explicit configuration, no spans are created. The `QueryClientEvent` system requires an explicit subscriber. There is no built-in persistent audit log.

### 4.3 Determinism & Reproducibility -- Score: 9/10

**Deterministic cache keys:** `stableStringify()` sorts object keys lexicographically, ensuring identical output regardless of key insertion order.

From `cache/stable-stringify.ts` (lines 18-34):

```typescript
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  if (isRecord(value)) {
    const sortedKeys = Object.keys(value).sort();
    const pairs = sortedKeys.map(key => JSON.stringify(key) + ":" + stableStringify(value[key]));
    return "{" + pairs.join(",") + "}";
  }
  return JSON.stringify(value) ?? "undefined";
}
```

**Injectable clock:** The `QueryClient` accepts a `Clock` interface, enabling deterministic timestamp control in tests.

From `cache/query-cache.ts` (lines 60-64):

```typescript
export interface Clock {
  readonly now: () => number;
}
const systemClock: Clock = { now: () => Date.now() };
```

**Deterministic retry:** The default backoff formula is explicit and deterministic for any given attempt number:

From `types/options.ts` (line 57):

```typescript
retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000),
```

**Structural sharing determinism:** `replaceEqualDeep()` always returns the previous reference when structurally equal, or the new value otherwise -- no randomness involved.

**Gap:** The `staleTime` comparison depends on `clock.now()` which in production uses `Date.now()`, introducing wall-clock non-determinism (expected for real applications but worth noting).

### 4.4 Error Handling & Recovery -- Score: 9/10

**Tagged union errors:** The `QueryResolutionError` type covers 7 distinct failure modes, each with a `_tag` discriminant for pattern matching:

From `types/errors.ts` (lines 14-21):

```typescript
export type QueryResolutionError =
  | QueryFetchFailed
  | QueryCancelled
  | QueryTimeout
  | QueryAdapterMissing
  | QueryInvalidationCycle
  | QueryDisposed
  | BatchExecutionFailed;
```

Each variant carries context-specific fields: `QueryFetchFailed` includes `portName`, `params`, `retryAttempt`, and `cause`; `QueryInvalidationCycle` includes the `chain` of port names and current `depth`.

**Result-based API:** All async operations return `ResultAsync<TData, TError | QueryResolutionError>` -- never throw. User callbacks are wrapped in `safeCall()` / `safeCallAsync()` to prevent callback exceptions from breaking the never-reject invariant.

From `client/query-client.ts` (lines 438-448):

```typescript
function safeCall(fn: () => void): void {
  fromThrowable(fn, () => undefined);
}

function safeCallAsync<T>(fn: () => T | Promise<T>): ResultAsync<T, unknown> {
  return ResultAsync.fromPromise(Promise.resolve().then(fn), cause => cause);
}
```

**Retry with backoff:** `fetchWithRetry()` supports configurable retry count, custom retry predicates, and custom delay functions. Abort signals are checked before each retry delay to prevent wasted work.

From `cache/retry.ts` (lines 65-102):

```typescript
export function fetchWithRetry<TData, TError>(
  portName: string,
  params: unknown,
  fetcher: () => ResultAsync<TData, TError>,
  config: RetryConfig,
  signal?: AbortSignal,
  onRetry?: (attempt: number) => void
): ResultAsync<TData, TError | QueryFetchFailed> {
  const execute = async (): Promise<Result<TData, TError | QueryFetchFailed>> => {
    let attempt = 0;
    for (;;) {
      const result = await fetcher();
      if (result.isOk()) return ok(result.value);
      if (!shouldRetry(config, attempt, result.error))
        return err(queryFetchFailed(portName, params, attempt, result.error));
      if (signal?.aborted) return err(queryFetchFailed(portName, params, attempt, signal.reason));
      const delayMs = getRetryDelay(config, attempt, result.error);
      if (delayMs > 0) {
        const delayResult = await fromPromise(delay(delayMs, signal), () =>
          queryFetchFailed(portName, params, attempt, signal?.reason ?? result.error)
        );
        if (delayResult.isErr()) return err(delayResult.error);
      }
      attempt++;
      onRetry?.(attempt);
    }
  };
  return ResultAsync.fromResult(execute());
}
```

**Invalidation cycle detection:** The `QueryClient` tracks invalidation depth and returns `QueryInvalidationCycle` when the configurable `maxInvalidationDepth` (default 10) is exceeded.

**Gap:** `QueryTimeout` is defined as an error variant but no built-in timeout enforcement exists in the core fetch path. Timeout must be implemented by adapters or via `AbortSignal.timeout()`.

### 4.5 Validation & Input Verification -- Score: 5/10

**Compile-time validation (strong):** The `validators.ts` module provides sophisticated type-level validators:

- `ValidateQueryDependencies` -- circular dependency detection
- `FindMissingPorts` -- missing port reference detection
- `ValidateMutationEffects` -- validates invalidation/removal targets exist
- `ValidateQueryAdapterLifetime` -- captive dependency detection (singleton depending on scoped)
- `IsReachable` / `IsReachableViaNeighbors` -- type-level graph reachability for transitive cycle detection

From `types/validators.ts` (lines 84-95):

```typescript
export type ValidateQueryAdapterLifetime<
  TAdapterLifetime extends "singleton" | "scoped" | "transient",
  TDepLifetimes extends ReadonlyArray<"singleton" | "scoped" | "transient">,
> = TAdapterLifetime extends "singleton"
  ? HasNonSingleton<TDepLifetimes> extends true
    ? `Error: Singleton adapter cannot depend on scoped or transient dependencies (captive dependency).`
    : true
  : TAdapterLifetime extends "scoped"
    ? HasTransient<TDepLifetimes> extends true
      ? `Error: Scoped adapter cannot depend on transient dependencies (captive dependency).`
      : true
    : true;
```

**Runtime validation (weak):** Port identity is validated via branded `CacheKey` types and `isQueryPort()` / `isMutationPort()` type guards using `Symbol.for()` brands. However, adapter-returned data is not validated against any schema.

**Gap:** No runtime response schema validation. Data returned by fetchers is accepted as-is and stored in the cache. In a GxP context, this means corrupted or malformed responses could propagate through the system undetected.

### 4.6 Change Control & Versioning -- Score: 7/10

**Port-based API contract:** Query and mutation ports define explicit type contracts via generic parameters (`TData`, `TParams`, `TError`). Ports are frozen with `Object.freeze()` to prevent runtime mutation.

From `ports/query-port.ts` (lines 121-137):

```typescript
return <const TName extends string, const TDependsOn extends ReadonlyArray<AnyQueryPort> = []>(
  config: QueryPortConfig<TData, TParams, TError, TName, TDependsOn>
): QueryPort<TName, TData, TParams, TError, TDependsOn> => {
  return brandAsQueryPort<TName, TData, TParams, TError, TDependsOn>(
    Object.freeze({
      __portName: config.name,
      [QUERY_PORT_SYMBOL]: true,
      config: Object.freeze({
        ...config,
        dependsOn: config.dependsOn ?? [],
      }),
    })
  );
};
```

**Dehydration versioning:** The `DehydratedState` interface uses `version: 3`:

From `client/dehydration.ts` (lines 19-28):

```typescript
export interface DehydratedState {
  readonly version: 3;
  readonly queries: ReadonlyArray<{
    readonly cacheKey: CacheKey;
    readonly result:
      | { readonly _tag: "Ok"; readonly value: unknown }
      | { readonly _tag: "Err"; readonly error: unknown };
    readonly dataUpdatedAt: number;
  }>;
}
```

**Gap:** No migration logic for dehydrated states at version 1 or 2. The `hydrate()` function does not check the `version` field before processing. If a serialized v1/v2 state is passed, it will be processed with the v3 schema assumption, potentially causing silent data corruption.

**Gap:** No formal changelog or API stability guarantees visible in the source code. The project `CLAUDE.md` explicitly states "No backward compatibility" and "Break and change freely."

### 4.7 Testing & Verification -- Score: 9/10

**Test coverage:** 82 test files spanning:

| Sub-package | Test files | Categories                                                                                                                  |
| ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| core        | 45         | Unit tests, integration, e2e (SSR, scope lifecycle, streaming SSR), type tests (.test-d.ts), tracing, inspector, reactivity |
| react       | 27         | Hook tests, e2e lifecycle, suspense, error boundary, mutation kill-mutant tests                                             |
| testing     | 10         | Assertion utilities, mock/spy adapters, test containers, mutation testing (kill-mutant)                                     |

**Mutation testing:** Multiple `*-mutants.test.ts` files indicate Stryker mutation testing is used (confirmed by `.stryker-tmp` directories), providing high confidence in test effectiveness.

**Type-level tests:** Files like `validators.test-d.ts`, `query-client.test-d.ts`, `cache-key.test-d.ts`, and `hooks.test-d.ts` verify compile-time type behavior.

**Integration test categories:**

- `cache-persistence.test.ts` -- durable storage round-trip
- `cache-pipeline.test.ts` -- end-to-end cache operations
- `dependent-queries.test.ts` -- query dependency chains
- `hexdi-integration.test.ts` -- DI container integration
- `optimistic-updates.test.ts` -- mutation optimistic update scenarios
- `parallel-queries.test.ts` -- concurrent query execution
- `polling.test.ts` -- refetch interval behavior
- `window-focus-reconnect.test.ts` -- browser event-driven refetch

### 4.8 Security -- Score: 5/10

**Immutable port definitions:** Ports are frozen with `Object.freeze()`, preventing runtime tampering.

**Abort signal support:** Both queries and mutations accept `AbortSignal` for cancellation, and the `combineSignals()` helper properly combines user-provided and internal abort signals.

From `client/query-client.ts` (lines 1093-1109):

```typescript
function combineSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const onAbort = (): void => {
    controller.abort();
  };
  if (signal1.aborted || signal2.aborted) {
    controller.abort();
    return controller.signal;
  }
  signal1.addEventListener("abort", onAbort, { once: true });
  signal2.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}
```

**Gap:** No cache encryption. The `CachePersister` interface stores `CacheEntry` objects directly to storage backends (localStorage, IndexedDB, etc.) without encryption. Sensitive data in query responses would be stored in plaintext.

**Gap:** No built-in CSRF protection. Query fetchers receive a `FetchContext` with `signal` and `meta` but no CSRF tokens. This is delegated to the adapter implementation.

**Gap:** No cache entry expiration enforcement on read. While GC sweeps remove expired entries periodically (default 60s interval), stale data can be served between sweeps.

**Gap:** No mechanism to scrub sensitive fields from cache entries before persistence or logging.

### 4.9 Documentation -- Score: 8/10

**JSDoc coverage:** Every public module has a `@packageDocumentation` comment. Major interfaces and functions have JSDoc descriptions explaining their purpose and constraints.

**Architecture markers:** Source files use consistent section markers (`// =============================================================================`) to organize code into logical blocks (Types, Factory, Helpers, etc.).

**BRAND_CAST documentation:** Type-unsafe boundaries are explicitly documented with `BRAND_CAST` or `GENERIC_BOUNDARY` comments explaining why the coercion is sound:

From `cache/structural-sharing.ts` (line 51):

```typescript
// GENERIC_BOUNDARY: structural sharing preserves T shape by construction
return coercePreservedStructure<T>(result);
```

**Gap:** No standalone API documentation or usage guides in the source tree. Documentation exists only as inline JSDoc.

### 4.10 Compliance-Specific for Data Fetching -- Score: 8/10

**Request deduplication:** The `DeduplicationMap` ensures concurrent requests for the same cache key share a single fetch. Auto-cleanup occurs on settlement via `mapBoth`:

From `client/deduplication.ts` (lines 43-70):

```typescript
export function createDeduplicationMap(): DeduplicationMap {
  const inflight = new Map<
    string,
    { promise: ResultAsync<unknown, unknown>; controller: AbortController }
  >();
  return {
    dedupe<TData, TError>(
      serializedKey: string,
      factory: () => ResultAsync<TData, TError>
    ): ResultAsync<TData, TError> {
      const existing = inflight.get(serializedKey);
      if (existing) return narrowInflight<TData, TError>(existing.promise);
      const controller = new AbortController();
      const promise = factory();
      inflight.set(serializedKey, { promise, controller });
      const cleanup = (): void => {
        inflight.delete(serializedKey);
      };
      void promise.mapBoth(cleanup, cleanup);
      return promise;
    },
    // ...
  };
}
```

**Response immutability:** Cache entries use signal-backed reactive state. The public `CacheEntrySnapshot` is a plain readonly object produced via `getSnapshot()` which reads signals without tracking:

From `cache/cache-entry.ts` (lines 141-155):

```typescript
export function getSnapshot<TData, TError>(
  entry: ReactiveCacheEntry<TData, TError>
): CacheEntrySnapshot<TData, TError> {
  return {
    result: entry.result$.peek(),
    data: entry.data.peek(),
    error: entry.error.peek(),
    status: entry.status.peek(),
    fetchStatus: entry.fetchStatus$.peek(),
    dataUpdatedAt: entry.dataUpdatedAt$.peek(),
    errorUpdatedAt: entry.errorUpdatedAt$.peek(),
    fetchCount: entry.fetchCount$.peek(),
    isInvalidated: entry.isInvalidated$.peek(),
  };
}
```

**Cache invalidation:** Three invalidation strategies are supported:

1. Port-level invalidation (`invalidateQueries(port)`)
2. Predicate-based invalidation (`invalidateMatching(predicate)`)
3. Global invalidation (`invalidateAll()`)

Active queries (those with subscribers) are automatically refetched after invalidation.

**Mutation side effects:** Mutation ports declare `effects.invalidates` and `effects.removes` arrays, creating a static dependency graph between mutations and queries. The `QueryInspector` tracks runtime invalidation edges and detects cycles.

**Garbage collection:** Unused cache entries (no subscribers) are automatically collected after `cacheTime` (default 5 minutes) via periodic GC sweeps:

From `cache/query-cache.ts` (lines 178-202):

```typescript
function gcSweep(): void {
  const now = clock.now();
  const keysToRemove: string[] = [];
  for (const [serialized, entry] of entries) {
    if (hasSubscribers(entry)) continue;
    const cacheTime = DEFAULT_QUERY_OPTIONS.cacheTime;
    const dataUpdatedAt = entry.dataUpdatedAt$.peek();
    const errorUpdatedAt = entry.errorUpdatedAt$.peek();
    if (dataUpdatedAt !== undefined && now - dataUpdatedAt > cacheTime) {
      keysToRemove.push(serialized);
    } else if (errorUpdatedAt !== undefined && now - errorUpdatedAt > cacheTime) {
      keysToRemove.push(serialized);
    }
  }
  for (const serialized of keysToRemove) {
    // ... delete and emit event
  }
}
```

---

## 5. Code Examples

### 5.1 Compliant Pattern: Branded Cache Key Construction

All cache keys must pass through `createCacheKey()` or `createCacheKeyFromName()`, which enforce deterministic serialization via the branded type system. Ad-hoc construction is prevented by the unique symbol brand.

From `cache/cache-key.ts` (lines 26-31, 55-58, 68-74):

```typescript
export type CacheKey<TName extends string = string> = readonly [
  portName: TName,
  paramsHash: string,
] & {
  readonly [__cacheKeyBrand]: true;
};

function brandAsCacheKey<TName extends string>(tuple: readonly [TName, string]): CacheKey<TName>;
function brandAsCacheKey(tuple: readonly [string, string]): readonly [string, string] {
  return tuple;
}

export function createCacheKey<TName extends string>(
  port: PortLike<TName>,
  params: unknown
): CacheKey<TName> {
  const tuple: readonly [TName, string] = [port.__portName, stableStringify(params)];
  return brandAsCacheKey(tuple);
}
```

### 5.2 Compliant Pattern: Disposed State Guard

Every QueryClient operation checks disposal state before proceeding, returning a typed error instead of throwing:

From `client/query-client.ts` (lines 414-419):

```typescript
function assertNotDisposed(portName: string): Result<void, QueryResolutionError> {
  if (disposed) {
    return err(queryDisposed(portName));
  }
  return ok(undefined);
}
```

### 5.3 Compliant Pattern: Reactive Cache Entry with Signal Isolation

Cache entries use per-system signal isolation to prevent cross-container interference:

From `cache/cache-entry.ts` (lines 75-131):

```typescript
export function createReactiveCacheEntry<TData, TError>(
  key: string,
  system?: ReactiveSystemInstance
): ReactiveCacheEntry<TData, TError> {
  const result$ = createSignal<Result<TData, TError> | undefined>(undefined, system);
  const fetchStatus$ = createSignal<FetchStatus>("idle", system);
  const fetchCount$ = createSignal<number>(0, system);
  const isInvalidated$ = createSignal<boolean>(false, system);
  const dataUpdatedAt$ = createSignal<number | undefined>(undefined, system);
  const errorUpdatedAt$ = createSignal<number | undefined>(undefined, system);

  const status = createComputed<QueryStatus>(() => {
    const r = result$.get();
    if (r === undefined) return "pending";
    return r.isOk() ? "success" : "error";
  }, system);
  // ... derived computeds
}
```

### 5.4 Non-Compliant Pattern: No Response Validation

Adapter-returned data is stored directly without runtime schema verification:

From `client/query-client.ts` (lines 569-573):

```typescript
.map(data => {
  cache.set(port, params, data, {
    structuralSharing: port.config.defaults?.structuralSharing ?? defaults.structuralSharing,
  });
  // data is stored as-is -- no validation against TData schema
```

### 5.5 Non-Compliant Pattern: Dehydration Version Not Checked

The `hydrate()` function processes any `DehydratedState` without verifying the `version` field:

From `client/dehydration.ts` (lines 113-130):

```typescript
export function hydrate(client: QueryClient, state: DehydratedState): void {
  for (const query of state.queries) {
    // No version check: state.version is not examined
    const portLike = { __portName: query.cacheKey[0] };
    const params = parseParamsHash(query.cacheKey[1]);
    const existing = client.cache.get(portLike, params);
    if (existing !== undefined && existing.status === "success") continue;
    if (query.result._tag === "Ok") {
      client.cache.set(portLike, params, query.result.value);
    } else {
      client.cache.setError(portLike, params, query.result.error);
    }
  }
}
```

---

## 6. Edge Cases & Known Limitations

### 6.1 Stale Data Window Between GC Sweeps

The GC runs on a configurable interval (default 60 seconds). Between sweeps, cache entries that have exceeded `cacheTime` may still be served by `cache.get()`. The GC only checks `dataUpdatedAt` and `errorUpdatedAt`, not the current request time.

**Impact:** In a GxP-regulated context, stale data could be presented to users during the window between cache expiry and the next GC cycle.

**Mitigation:** The `isStale` flag on `QueryState` allows consumers to detect and handle stale data. The `staleTime` configuration controls freshness checking at the fetch path level.

### 6.2 Cache Key Collision for Non-Serializable Values

`stableStringify()` falls back to `JSON.stringify(value) ?? "undefined"` for non-plain-object values. Functions, Symbols, and circular references produce `"undefined"` as the serialized key, leading to potential collisions.

**Impact:** Two different function-valued params would produce the same cache key, causing incorrect data sharing.

**Mitigation:** Query parameters should be restricted to JSON-serializable values. The compile-time type system encourages this through the `TParams` generic.

### 6.3 Unprotected Persistence Layer

The `CachePersister` interface (`persistQuery`, `restoreQuery`, `restoreAll`, `clear`) does not include any encryption, signing, or integrity verification. The `PersistenceManager` stores and restores entries as-is.

**Impact:** Sensitive query data persisted to localStorage/IndexedDB is accessible to any JavaScript on the same origin.

**Mitigation:** Consumers should implement encryption in their `CachePersister` adapter. The interface is designed for composition, so a wrapping persister that encrypts/decrypts is straightforward.

### 6.4 No Timeout Enforcement in Core Fetch Path

While `QueryTimeout` is a defined error variant, the core `doFetch()` function does not implement any timeout logic. The `AbortSignal` mechanism supports external timeouts, but no default timeout is enforced.

**Impact:** Long-running fetches could hang indefinitely without explicit adapter-level or caller-level timeout configuration.

**Mitigation:** Callers can pass `AbortSignal.timeout(ms)` via `FetchOptions.signal`. Adapters should implement their own timeout logic.

### 6.5 Observer Re-activation After Destruction (React StrictMode)

`QueryObserver.subscribe()` re-activates a destroyed observer by resetting `destroyed = false` and re-subscribing to cache events. This handles React StrictMode's unmount/remount cycle, but could lead to unexpected behavior if `subscribe()` is called after intentional destruction.

From `client/query-observer.ts` (lines 226-233):

```typescript
subscribe(listener: (state: QueryState<TData, TError>) => void): () => void {
  if (destroyed) {
    destroyed = false;
    unsubscribeCache = client.cache.subscribe(() => { notify(); });
    client.cache.incrementObservers(port, params);
  }
  listeners.add(listener);
  return () => { listeners.delete(listener); };
},
```

**Impact:** Leaked observers could silently resurrect and consume resources.

### 6.6 `parseParamsHash` Fallback in Hydration

The `parseParamsHash()` function uses `fromThrowable` with a fallback that returns the raw string if `JSON.parse` fails:

From `client/dehydration.ts` (lines 92-100):

```typescript
function parseParamsHash(paramsHash: string): unknown {
  if (paramsHash === "undefined") return undefined;
  return fromThrowable(
    (): unknown => JSON.parse(paramsHash),
    () => paramsHash
  ).unwrapOr(paramsHash);
}
```

**Impact:** Malformed params hashes in dehydrated state silently produce incorrect cache keys instead of failing with an error.

### 6.7 Cross-Container Batch Detection is Advisory Only

The `setBatchDiagnostics()` callback detects when two different containers batch simultaneously via `alien-signals`' global batching, but it cannot prevent the cross-contamination:

From `reactivity/batch.ts` (lines 100-108):

```typescript
if (_onCrossContainerBatch !== null && _activeBatchTarget !== null) {
  const existing = _activeBatchTarget.deref();
  if (existing !== undefined && existing !== containerOrScope) {
    _onCrossContainerBatch(containerOrScope, existing);
  }
}
```

**Impact:** Notification ordering could be affected when multiple containers batch concurrently using global `alien-signals` mode. Per-container `createIsolatedReactiveSystem()` eliminates this risk.

### 6.8 Fetch Counter Accuracy During Rapid Operations

The `fetchingCounts` map uses increment/decrement operations without atomic guarantees. While JavaScript is single-threaded, the async nature of fetch operations means the count could temporarily be incorrect between an `incrementFetching` and the corresponding `decrementFetching` if an error occurs in the intermediate code path before the decrement is reached.

**Impact:** `isFetching()` may return an inflated count temporarily if an error path misses the decrement (though code review shows all paths are covered via `.map()` / `.mapErr()`).

---

## 7. Recommendations

### Tier 1: Critical (Required for GxP Compliance)

1. **Add runtime response validation.** Introduce an optional `schema` or `validate` function on `QueryPortConfig` that verifies adapter-returned data before caching. This is the most significant gap for data integrity compliance.

2. **Make audit trail mandatory.** Provide a default `QueryClientEvent` subscriber that logs to a configurable sink (console, structured logger). In GxP environments, opt-in tracing is insufficient -- all data operations should be traceable by default.

3. **Verify dehydration version on hydrate.** The `hydrate()` function should check `state.version === 3` and reject or migrate incompatible versions with an explicit error.

### Tier 2: Important (Recommended for Production GxP)

4. **Add cache encryption support.** Either provide a built-in encrypting `CachePersister` wrapper or document the requirement for consumers to implement their own. Consider adding an `encrypt`/`decrypt` hook to `PersistenceConfig`.

5. **Enforce configurable fetch timeout.** Add a `timeout` option to `QueryDefaults` that wraps the fetch in `AbortSignal.timeout(ms)` at the `doFetch()` level, rather than relying on adapter-level implementation.

6. **Add staleness enforcement on cache reads.** Consider rejecting cache entries that have exceeded `cacheTime` at read time (in `cache.get()`), not just during GC sweeps, to prevent serving expired data.

7. **Log or warn on `parseParamsHash` fallback.** When `JSON.parse` fails during hydration, emit a warning event rather than silently falling back to the raw string.

### Tier 3: Desirable (Defense in Depth)

8. **Add data integrity checksums.** Include an optional checksum field in `CacheEntrySnapshot` that verifies data has not been corrupted in storage.

9. **Document `stableStringify` limitations.** Explicitly document that non-JSON-serializable values (functions, Symbols, circular references) produce colliding cache keys.

10. **Add formal API stability markers.** Introduce `@public`, `@internal`, `@experimental` markers to clearly communicate which APIs are stable for GxP-regulated consumers.

11. **Add rate limiting to invalidation.** Beyond the cycle depth limit, consider adding a time-based rate limit to prevent invalidation storms from overwhelming the system.

12. **Separate diagnostic events from operational events.** Consider splitting `QueryClientEvent` into operational events (required for audit trail) and diagnostic events (optional for debugging) to reduce noise in compliance logs.

---

## 8. File Reference Guide

### Core Source Files

| File                                      | Purpose                                                     | GxP Relevance                                          |
| ----------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| `cache/stable-stringify.ts`               | Deterministic JSON serialization with sorted keys           | **Critical** -- ensures cache key reproducibility      |
| `cache/cache-key.ts`                      | Branded cache key construction and serialization            | **Critical** -- prevents ad-hoc key construction       |
| `cache/cache-entry.ts`                    | Signal-backed reactive cache entries with snapshots         | **High** -- data integrity, timestamp tracking         |
| `cache/query-cache.ts`                    | In-memory cache with GC, subscriptions, invalidation        | **High** -- data lifecycle management                  |
| `cache/retry.ts`                          | Exponential backoff retry with abort signal support         | **High** -- resilience and error recovery              |
| `cache/structural-sharing.ts`             | Deep reference preservation via `replaceEqualDeep()`        | **Medium** -- referential stability for UI correctness |
| `client/query-client.ts`                  | Core orchestrator (1132 lines)                              | **Critical** -- all data flow passes through here      |
| `client/query-observer.ts`                | State tracking with referential stability                   | **High** -- observer pattern for reactive UI           |
| `client/deduplication.ts`                 | In-flight request sharing                                   | **High** -- prevents redundant fetches                 |
| `client/dehydration.ts`                   | SSR state serialization/restoration                         | **Medium** -- data portability, version concerns       |
| `client/type-boundary.ts`                 | Type-safe narrowing via overload patterns                   | **Medium** -- type safety at generic boundaries        |
| `types/errors.ts`                         | 7-variant `QueryResolutionError` tagged union               | **Critical** -- error classification and attribution   |
| `types/options.ts`                        | Default query configuration with backoff formula            | **High** -- behavior determinism                       |
| `types/state.ts`                          | `QueryState` and `MutationState` interfaces                 | **High** -- state contract definition                  |
| `types/validators.ts`                     | Compile-time graph and dependency validators                | **High** -- configuration correctness                  |
| `ports/query-port.ts`                     | Query port factory with `Symbol.for` branding               | **High** -- API contract definition                    |
| `ports/mutation-port.ts`                  | Mutation port factory with effects declaration              | **High** -- side effect graph                          |
| `ports/types.ts`                          | `QueryFetcher`, `MutationExecutor`, `FetchContext`          | **High** -- adapter contract                           |
| `inspector/query-inspector.ts`            | Fetch history, diagnostics, suggestions (985 lines)         | **High** -- observability and compliance monitoring    |
| `inspector/port.ts`                       | QueryInspector DI port definition                           | **Low** -- wiring concern                              |
| `integration/library-inspector-bridge.ts` | Bridges QueryInspector to container inspection protocol     | **Medium** -- unified observability                    |
| `persistence/cache-persister.ts`          | Durable storage interface                                   | **High** -- data persistence contract                  |
| `persistence/persistence-manager.ts`      | Wires persister to cache lifecycle events                   | **High** -- persistence orchestration                  |
| `tracing/types.ts`                        | `TracerLike`, span attribute interfaces                     | **High** -- tracing contract                           |
| `tracing/query-tracing-hook.ts`           | Creates distributed tracing spans for queries               | **High** -- audit trail implementation                 |
| `tracing/tracing-bridge.ts`               | Adapts tracer implementations to hook options               | **Medium** -- integration adapter                      |
| `reactivity/signals.ts`                   | Signal/Computed/Effect primitives wrapping alien-signals    | **Medium** -- reactive infrastructure                  |
| `reactivity/batch.ts`                     | Batched updates with cross-container detection              | **Medium** -- notification correctness                 |
| `reactivity/system-factory.ts`            | Isolated reactive system for per-container signal isolation | **Medium** -- scope isolation                          |
| `adapters/adapter-bridge.ts`              | Constructs `AdapterConstraint` objects for DI registration  | **Low** -- adapter construction                        |
| `adapters/query-adapter.ts`               | Query adapter factory                                       | **Medium** -- adapter registration                     |
| `adapters/mutation-adapter.ts`            | Mutation adapter factory                                    | **Medium** -- adapter registration                     |
| `adapters/streamed-query-adapter.ts`      | Streaming query adapter with progressive updates            | **Medium** -- streaming data support                   |

### Test Coverage by Area

| Area               | Test Files                                                                                   | Key Scenarios                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cache key          | `cache-key.test.ts`                                                                          | Deterministic serialization, branded type                                                               |
| Cache operations   | `cache.test.ts`                                                                              | CRUD, invalidation, GC, subscriber tracking                                                             |
| Deduplication      | `dedup.test.ts`                                                                              | Concurrent request sharing, cleanup                                                                     |
| Dehydration        | `dehydration.test.ts`                                                                        | SSR round-trip, version handling                                                                        |
| Error types        | `query-resolution-error.test.ts`                                                             | Error variant construction and matching                                                                 |
| Retry              | `retry.test.ts`                                                                              | Backoff, abort, custom predicates                                                                       |
| Structural sharing | `structural-sharing.test.ts`                                                                 | Reference preservation, deep comparison                                                                 |
| Query client       | `query-client.test.ts`, `query-client-mutation.test.ts`, `query-client-disposal.test.ts`     | Full client lifecycle, mutation effects, disposal                                                       |
| Observer           | `query-observer.test.ts`                                                                     | State tracking, referential stability, destruction                                                      |
| Inspector          | `query-inspector.test.ts`, `runtime-invalidation.test.ts`                                    | Fetch history, diagnostics, invalidation graph                                                          |
| Staleness          | `staleness.test.ts`                                                                          | Stale time computation, GC eligibility                                                                  |
| Reactivity         | `signals.test.ts`, `batch.test.ts`, `reactive-cache-entry.test.ts`, `system-factory.test.ts` | Signal primitives, batching, isolation                                                                  |
| Tracing            | `query-tracing-hook.test.ts`, `query-client-tracing.test.ts`, `tracing-bridge.test.ts`       | Span creation, filtering, bridge                                                                        |
| Integration        | 11 integration test files                                                                    | Persistence, pipelines, dependent queries, HexDI integration, optimistic updates, polling, window focus |
| E2E                | `scope-lifecycle.test.ts`, `ssr.test.ts`, `streaming-ssr.test.ts`                            | Full lifecycle scenarios                                                                                |
| React hooks        | 27 test files                                                                                | useQuery, useMutation, useQueries, useSuspenseQuery, useInfiniteQuery, useIsFetching, inspection hooks  |
| Testing utilities  | 10 test files                                                                                | Mock adapters, spy adapters, assertions, test containers                                                |

---

_End of GxP Compliance Analysis Report for @hex-di/query_
