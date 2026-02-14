# Technical Refinement: @hex-di/query GxP Compliance (7.5 -> 10/10)

**Package:** `@hex-di/query` (core, react, testing)
**Current Score:** 7.5 / 10
**Target Score:** 10 / 10
**Date:** 2026-02-10
**Constraint:** Tracing (QueryTracingHook) remains OPTIONAL. Emit a one-time warning when queries execute without tracing configured. Never block or throw.

---

## 1. Current Score Breakdown

| #   | Criterion                           | Current | Target | Delta |
| --- | ----------------------------------- | ------- | ------ | ----- |
| 1   | Data Integrity (ALCOA+)             | 8/10    | 10/10  | +2    |
| 2   | Traceability & Audit Trail          | 7/10    | 10/10  | +3    |
| 3   | Determinism & Reproducibility       | 9/10    | 10/10  | +1    |
| 4   | Error Handling & Recovery           | 9/10    | 10/10  | +1    |
| 5   | Validation & Input Verification     | 5/10    | 10/10  | +5    |
| 6   | Change Control & Versioning         | 7/10    | 10/10  | +3    |
| 7   | Testing & Verification              | 9/10    | 10/10  | +1    |
| 8   | Security                            | 5/10    | 10/10  | +5    |
| 9   | Documentation                       | 8/10    | 10/10  | +2    |
| 10  | Compliance-Specific (Data Fetching) | 8/10    | 10/10  | +2    |

**Weighted composite: 7.5 -> 10.0**

---

## 2. Gap Analysis

### Gap 1: No Response Schema Validation (Criteria 1, 5)

**Current state:** In `client/query-client.ts` line 569, adapter-returned data is stored directly into the cache without any runtime validation:

```typescript
.map(data => {
  cache.set(port, params, data, {
    structuralSharing: port.config.defaults?.structuralSharing ?? defaults.structuralSharing,
  });
```

The `QueryPortConfig` interface in `ports/query-port.ts` (lines 34-49) has no `validate` or `schema` field. TypeScript generics provide compile-time safety via `TData`, but runtime payloads from fetchers are trusted unconditionally. In a GxP environment, a malformed API response (wrong shape, missing fields, incorrect types) would propagate through the cache undetected.

**Impact:** ALCOA "Accurate" criterion fails. Data integrity cannot be guaranteed at runtime.

### Gap 2: No Mandatory Audit Trail (Criterion 2)

**Current state:** The `QueryClientEvent` system in `client/query-client.ts` (lines 214-263) defines 13 event types, but requires an explicit `subscribeToEvents()` call (line 1078). The `QueryTracingHook` is opt-in via the `tracingHook` or `tracer` field on `QueryClientConfig` (lines 276-282). Without either configuration, zero audit events are captured.

In `createQueryClient()` (line 301), tracing resolution:

```typescript
const tracingHook =
  config.tracingHook ??
  (config.tracer !== undefined ? createQueryTracingHook({ tracer: config.tracer }) : undefined);
```

When `tracingHook` is `undefined`, all `tracingHook?.onFetchStart(...)` calls at lines 497, 545, 582, 591, 602, 729, 747, 803 are silently skipped via optional chaining. No warning is emitted.

**Impact:** Traceability criterion fails. Operations execute with no audit record by default.

### Gap 3: No Cache Encryption for Sensitive Data (Criterion 8)

**Current state:** The `CachePersister` interface in `persistence/cache-persister.ts` (lines 28-42) stores `CacheEntry<unknown, unknown>` objects directly. The `PersistenceManager` in `persistence/persistence-manager.ts` calls `persister.persistQuery(event.key, event.entry)` at line 111 with raw entry data. No encryption, scrubbing, or integrity hooks exist.

**Impact:** Security criterion fails. Sensitive PHI/PII in query responses persisted to localStorage/IndexedDB is stored in plaintext.

### Gap 4: Dehydration Version Not Checked on Hydrate (Criterion 6)

**Current state:** The `DehydratedState` interface in `client/dehydration.ts` (line 19) declares `version: 3`, but the `hydrate()` function at line 113 processes any `DehydratedState` without examining the `version` field:

```typescript
export function hydrate(client: QueryClient, state: DehydratedState): void {
  for (const query of state.queries) {
    // No version check
```

No migration logic for v1 or v2 exists anywhere in the codebase. A v1/v2 payload would be processed with v3 schema assumptions, potentially causing silent data corruption.

**Impact:** Change control criterion fails. Version transitions are unprotected.

### Gap 5: No Request Correlation/Trace IDs on Cache Events (Criterion 2)

**Current state:** `CacheEvent` in `cache/query-cache.ts` (lines 37-42) carries `key` and `entry` but no correlation ID:

```typescript
export type CacheEvent =
  | { readonly type: "added"; readonly key: CacheKey; readonly entry: CacheEntrySnapshot }
  | { readonly type: "updated"; readonly key: CacheKey; readonly entry: CacheEntrySnapshot }
  | { readonly type: "removed"; readonly key: CacheKey }
  | { readonly type: "invalidated"; readonly key: CacheKey }
  | { readonly type: "cleared" };
```

`QueryClientEvent` (lines 214-263) also lacks a `traceId` or `correlationId` field. This makes it impossible to correlate a specific cache mutation to the fetch request that produced it.

**Impact:** Traceability criterion partially fails. Event correlation requires manual bookkeeping.

### Gap 6: stableStringify Fails Silently on Non-Serializable Values (Criteria 3, 5)

**Current state:** In `cache/stable-stringify.ts` (lines 18-34), `stableStringify` falls back to `JSON.stringify(value) ?? "undefined"` for non-plain-object values. For `Date`, `Map`, `Set`, `RegExp`, functions, Symbols, and circular references, this produces either `"undefined"` or an empty/lossy representation. Two different function-valued params produce the same cache key `"undefined"`, causing data collision.

No warning, no error, no detection.

**Impact:** Determinism criterion partially fails. Cache key collisions are possible and undetectable.

### Gap 7: No Timeout Enforcement on Fetches (Criterion 4)

**Current state:** `QueryTimeout` is defined in `types/errors.ts` (lines 38-42) as a first-class error variant with `timeoutMs` field, and a constructor `queryTimeout()` exists at line 82. However, the core `doFetch()` function in `client/query-client.ts` (lines 461-606) never creates an `AbortSignal.timeout()` and never constructs a `QueryTimeout` error. Timeout enforcement depends entirely on callers passing `AbortSignal.timeout(ms)` via `FetchOptions.signal`.

The `QueryDefaults` interface in `types/options.ts` (lines 15-48) has no `timeout` field.

**Impact:** Error handling criterion partially fails. Fetches can hang indefinitely.

### Gap 8: No CSRF Protection Guidance (Criterion 8)

**Current state:** `FetchContext` in `ports/types.ts` (lines 32-51) carries `signal` and `meta` but no CSRF token field. No JSDoc or documentation mentions CSRF. Adapters must implement their own protection with no framework support.

**Impact:** Security criterion partially fails.

### Gap 9: Error Cause is `unknown` Without Structured Validation (Criteria 4, 5)

**Current state:** `QueryFetchFailed.cause` is typed as `unknown` in `types/errors.ts` (line 28):

```typescript
export interface QueryFetchFailed {
  readonly _tag: "QueryFetchFailed";
  readonly portName: string;
  readonly params: unknown;
  readonly retryAttempt: number;
  readonly cause: unknown;
}
```

The `isAbortError()` function in `client/query-client.ts` (lines 1121-1131) performs ad-hoc runtime checks on `cause` using `instanceof DOMException` and duck-typing `_tag`/`cause` fields. No structured error classification exists for the cause.

**Impact:** Error handling completeness is reduced. Consumers must perform their own cause inspection.

### Gap 10: GC Sweep Timing Is Non-Deterministic (Criterion 3)

**Current state:** In `cache/query-cache.ts` lines 204-218, GC runs via `setInterval(gcSweep, gcConfig.interval)` with a default of 60 seconds. Between sweeps, expired entries remain readable via `cache.get()` (line 230) which returns snapshots without checking `cacheTime`. This creates a non-deterministic window (0-60s) where stale data can be served.

**Impact:** Determinism criterion partially fails. Data freshness is probabilistic between GC sweeps.

---

## 3. Required Changes (Exact Files, Code, Rationale)

### Change 1: Add `validate` Hook to QueryPortConfig

**File:** `libs/query/core/src/ports/query-port.ts`
**Lines:** 34-49 (QueryPortConfig interface)

**Rationale:** Allows each query port to declare a runtime validation function. The validator runs before data enters the cache, ensuring ALCOA "Accurate" compliance. The validator is optional to preserve backward compatibility, but GxP-sensitive ports SHOULD provide one.

**Change:** Add an optional `validate` field to `QueryPortConfig`:

```typescript
export interface QueryPortConfig<
  _TData,
  _TParams,
  _TError,
  TName extends string,
  TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
> {
  readonly name: TName;
  readonly dependsOn?: TDependsOn;
  readonly defaults?: Partial<QueryDefaults>;

  // NEW: Optional runtime response validator.
  // When provided, adapter-returned data must pass this check before caching.
  // Return the validated data (possibly narrowed) or throw to reject.
  // Thrown errors are wrapped as QueryValidationFailed.
  readonly validate?: (data: unknown) => _TData;
}
```

### Change 2: Add QueryValidationFailed Error Variant

**File:** `libs/query/core/src/types/errors.ts`
**Lines:** After line 21 (add to QueryResolutionError union)

**Rationale:** A dedicated error variant for validation failures provides clear attribution and pattern-matchable error handling distinct from fetch failures.

**Change:** Add to the union and create the interface + constructor:

```typescript
export type QueryResolutionError =
  | QueryFetchFailed
  | QueryCancelled
  | QueryTimeout
  | QueryAdapterMissing
  | QueryInvalidationCycle
  | QueryDisposed
  | BatchExecutionFailed
  | QueryValidationFailed; // NEW

export interface QueryValidationFailed {
  readonly _tag: "QueryValidationFailed";
  readonly portName: string;
  readonly params: unknown;
  readonly cause: unknown;
}

const _queryValidationFailed = createError("QueryValidationFailed");
export function queryValidationFailed(
  portName: string,
  params: unknown,
  cause: unknown
): QueryValidationFailed {
  return _queryValidationFailed({ portName, params, cause });
}
```

### Change 3: Apply Validation in doFetch Before Caching

**File:** `libs/query/core/src/client/query-client.ts`
**Lines:** 569-583 (inside the `.map(data => { ... })` callback in `doFetch`)

**Rationale:** This is the single point where adapter data enters the cache. Validating here catches all paths (fetch, retry completion, deduplication settlement).

**Change:** Wrap the cache write with a validation step:

```typescript
.map(data => {
  // Validate response if port declares a validator
  let validatedData = data;
  if (port.config.validate) {
    const validateResult = fromThrowable(
      () => port.config.validate(data),
      (cause) => queryValidationFailed(port.__portName, params, cause)
    );
    if (validateResult.isErr()) {
      // Validation failed -- do NOT cache, emit error event, return the error
      decrementFetching(port.__portName);
      cancellationControllers.delete(serialized);
      cache.setError(port, params, validateResult.error);
      emitEvent({
        type: "fetch-error",
        portName: port.__portName,
        params,
        durationMs: clock.now() - startTime,
        errorTag: "QueryValidationFailed",
      });
      tracingHook?.onFetchEnd(port.__portName, false);
      // This needs to be handled as an error in the Result chain.
      // The actual implementation should use .andThen() instead of .map()
      // to allow returning Err from within the success path.
      return data; // See Implementation Note below
    }
    validatedData = validateResult.value;
  }

  cache.set(port, params, validatedData, {
    structuralSharing:
      port.config.defaults?.structuralSharing ?? defaults.structuralSharing,
  });
  // ... rest unchanged
```

**Implementation Note:** The current `.map()` chain cannot return an `Err`. The implementation must change the `.map(data => ...)` to `.andThen(data => ...)` to allow the validation step to short-circuit with an error Result. Specifically:

```typescript
// Replace .map(data => { ... }) with:
.andThen(data => {
  if (port.config.validate) {
    const vResult = fromThrowable(
      () => port.config.validate(data),
      (cause) => queryValidationFailed(port.__portName, params, cause)
    );
    if (vResult.isErr()) {
      decrementFetching(port.__portName);
      cancellationControllers.delete(serialized);
      cache.setError(port, params, vResult.error);
      emitEvent({ type: "fetch-error", portName: port.__portName, params,
        durationMs: clock.now() - startTime, errorTag: "QueryValidationFailed" });
      tracingHook?.onFetchEnd(port.__portName, false);
      return err(vResult.error);
    }
    data = vResult.value;
  }

  cache.set(port, params, data, {
    structuralSharing: port.config.defaults?.structuralSharing ?? defaults.structuralSharing,
  });
  cancellationControllers.delete(serialized);
  decrementFetching(port.__portName);
  emitEvent({ type: "fetch-completed", portName: port.__portName, params,
    durationMs: clock.now() - startTime });
  tracingHook?.onFetchEnd(port.__portName, true);
  return ok(data);
})
```

And remove the separate `.mapErr()` handler's duplicate decrement logic, consolidating into the `.andThen()`.

### Change 4: Add One-Time Tracing Warning

**File:** `libs/query/core/src/client/query-client.ts`
**Lines:** 300-303 (after `tracingHook` resolution)

**Rationale:** Per the constraint, tracing remains optional but we must emit a one-time warning when queries execute without tracing configured. This satisfies the audit trail criterion by making the absence of tracing a conscious, logged decision.

**Change:** Add a warning flag and emission logic:

```typescript
const tracingHook =
  config.tracingHook ??
  (config.tracer !== undefined ? createQueryTracingHook({ tracer: config.tracer }) : undefined);

// NEW: one-time warning when tracing is not configured
let tracingWarningEmitted = false;

function warnNoTracing(): void {
  if (tracingHook !== undefined || tracingWarningEmitted) return;
  tracingWarningEmitted = true;
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      "[@hex-di/query] QueryClient created without tracing configured. " +
        "Query operations will not produce distributed tracing spans. " +
        "For GxP compliance, configure `tracer` or `tracingHook` in QueryClientConfig."
    );
  }
}
```

Then call `warnNoTracing()` at the beginning of `doFetch()` (after the `assertNotDisposed` check, around line 467):

```typescript
function doFetch<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options?: FetchOptions,
  trigger: FetchTrigger = "refetch-manual"
): ResultAsync<TData, TError | QueryResolutionError> {
  warnNoTracing();  // NEW: one-time warning
  const disposed_ = assertNotDisposed(port.__portName);
  // ...
```

And similarly at the start of the `mutate` method (around line 702).

### Change 5: Add Correlation ID to QueryClientEvent and CacheEvent

**File:** `libs/query/core/src/client/query-client.ts`
**Lines:** 214-263 (QueryClientEvent type)

**Rationale:** Correlation IDs enable linking a specific fetch-started event to its corresponding fetch-completed, cache-hit, retry, and the resulting cache update event. This is essential for audit trail reconstruction.

**Change:** Add a `correlationId` field to `QueryClientEvent`:

```typescript
export type QueryClientEvent =
  | {
      readonly type: "fetch-started";
      readonly correlationId: string; // NEW
      readonly portName: string;
      readonly params: unknown;
      readonly trigger: FetchTrigger;
    }
  | {
      readonly type: "fetch-completed";
      readonly correlationId: string; // NEW
      readonly portName: string;
      readonly params: unknown;
      readonly durationMs: number;
    };
// ... (add correlationId to all event variants)
```

**File:** `libs/query/core/src/cache/query-cache.ts`
**Lines:** 37-42 (CacheEvent type)

**Change:** Add optional `correlationId` to cache events:

```typescript
export type CacheEvent =
  | {
      readonly type: "added";
      readonly key: CacheKey;
      readonly entry: CacheEntrySnapshot;
      readonly correlationId?: string;
    }
  | {
      readonly type: "updated";
      readonly key: CacheKey;
      readonly entry: CacheEntrySnapshot;
      readonly correlationId?: string;
    }
  | { readonly type: "removed"; readonly key: CacheKey; readonly correlationId?: string }
  | { readonly type: "invalidated"; readonly key: CacheKey; readonly correlationId?: string }
  | { readonly type: "cleared"; readonly correlationId?: string };
```

**Generation strategy:** Use a monotonic counter (not crypto random) for correlation IDs to maintain determinism:

```typescript
let correlationCounter = 0;
function nextCorrelationId(): string {
  return `qc-${++correlationCounter}`;
}
```

Generate one at the start of `doFetch()` and thread it through all events emitted within that fetch lifecycle.

### Change 6: Add Dehydration Version Check in hydrate()

**File:** `libs/query/core/src/client/dehydration.ts`
**Lines:** 113-130 (hydrate function)

**Rationale:** Accepting unversioned or misversioned dehydrated state risks silent data corruption. The hydrate function must validate the version field.

**Change:**

```typescript
const CURRENT_DEHYDRATION_VERSION = 3;

export function hydrate(client: QueryClient, state: DehydratedState): void {
  // NEW: version check
  if (state.version !== CURRENT_DEHYDRATION_VERSION) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(
        `[@hex-di/query] Ignoring dehydrated state: version ${String(state.version)} ` +
          `is not compatible with current version ${CURRENT_DEHYDRATION_VERSION}. ` +
          `No migration path exists for older versions.`
      );
    }
    return;
  }

  for (const query of state.queries) {
    // ... existing logic unchanged
  }
}
```

Also add a `DehydrationVersionError` for programmatic detection (returned as a Result if the API is changed to return one), or use the warning approach above since `hydrate()` currently returns `void`.

### Change 7: Add parseParamsHash Warning on Fallback

**File:** `libs/query/core/src/client/dehydration.ts`
**Lines:** 92-100 (parseParamsHash function)

**Rationale:** Silent fallback to the raw string on parse failure produces incorrect cache keys. This should emit a warning.

**Change:**

```typescript
let parseWarningEmitted = false;

function parseParamsHash(paramsHash: string): unknown {
  if (paramsHash === "undefined") {
    return undefined;
  }
  const parsed = fromThrowable(
    (): unknown => JSON.parse(paramsHash),
    () => paramsHash
  );
  if (parsed.isErr()) {
    if (!parseWarningEmitted && typeof console !== "undefined") {
      parseWarningEmitted = true;
      console.warn(
        `[@hex-di/query] Failed to parse dehydrated params hash: ${JSON.stringify(paramsHash)}. ` +
          `Falling back to raw string. This may produce incorrect cache keys.`
      );
    }
  }
  return parsed.unwrapOr(paramsHash);
}
```

### Change 8: Add stableStringify Warning for Non-Serializable Values

**File:** `libs/query/core/src/cache/stable-stringify.ts`
**Lines:** 18-34 (stableStringify function)

**Rationale:** Non-JSON-serializable values (Date, Map, Set, RegExp, functions, Symbols) silently produce `"undefined"` or lossy output, leading to cache key collisions.

**Change:** Add detection for problematic types and emit a one-time warning:

```typescript
let nonSerializableWarningEmitted = false;

function warnNonSerializable(value: unknown, description: string): void {
  if (nonSerializableWarningEmitted) return;
  nonSerializableWarningEmitted = true;
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      `[@hex-di/query] stableStringify encountered a non-JSON-serializable value (${description}). ` +
        `This produces "undefined" as the serialized output, which may cause cache key collisions. ` +
        `Query params should be restricted to JSON-serializable values (strings, numbers, booleans, null, plain objects, arrays).`
    );
  }
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    // Detect functions and symbols
    if (typeof value === "function") {
      warnNonSerializable(value, "function");
    } else if (typeof value === "symbol") {
      warnNonSerializable(value, "symbol");
    }
    return JSON.stringify(value) ?? "undefined";
  }

  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }

  if (isRecord(value)) {
    // Detect special object types that serialize poorly
    if (value instanceof Date) {
      warnNonSerializable(value, "Date");
    } else if (value instanceof Map) {
      warnNonSerializable(value, "Map");
    } else if (value instanceof Set) {
      warnNonSerializable(value, "Set");
    } else if (value instanceof RegExp) {
      warnNonSerializable(value, "RegExp");
    }
    const sortedKeys = Object.keys(value).sort();
    const pairs = sortedKeys.map(key => JSON.stringify(key) + ":" + stableStringify(value[key]));
    return "{" + pairs.join(",") + "}";
  }

  // Non-plain objects (Date, Map, Set, etc. not caught by isRecord)
  warnNonSerializable(value, Object.getPrototypeOf(value)?.constructor?.name ?? "unknown");
  return JSON.stringify(value) ?? "undefined";
}
```

**Note:** The `isRecord` check (`typeof value === "object" && value !== null && !Array.isArray(value)`) currently returns `true` for Date, Map, Set, RegExp because they are all objects. The warning should be placed before the sorted-keys logic for these special types. Actually, reviewing the code: `isRecord` does return true for Date/Map/Set/RegExp. So the special-type detection needs to happen inside the `isRecord` branch, before doing `Object.keys(value).sort()`.

### Change 9: Add Default Fetch Timeout to QueryDefaults

**File:** `libs/query/core/src/types/options.ts`
**Lines:** 15-48 (QueryDefaults interface) and 53-65 (DEFAULT_QUERY_OPTIONS)

**Rationale:** Without a default timeout, fetches can hang indefinitely. The `QueryTimeout` error variant exists but is never produced by the core. Adding a configurable default timeout ensures all fetches have an upper bound.

**Change:**

```typescript
export interface QueryDefaults {
  // ... existing fields ...

  /** Default fetch timeout (ms). 0 means no timeout. Default: 30_000 (30s) */
  readonly timeout: number;
}

export const DEFAULT_QUERY_OPTIONS: QueryDefaults = {
  // ... existing defaults ...
  timeout: 30_000,
};
```

**File:** `libs/query/core/src/client/query-client.ts`
**Lines:** 524-530 (signal construction in doFetch)

**Change:** Apply timeout to the signal:

```typescript
// Inside doFetch, after the signal construction:
const timeoutMs = port.config.defaults?.timeout ?? defaults.timeout;
let fetchSignal = options?.signal
  ? combineSignals(options.signal, controller.signal)
  : controller.signal;

if (timeoutMs > 0) {
  fetchSignal = combineSignals(fetchSignal, AbortSignal.timeout(timeoutMs));
}

const fetchContext: FetchContext = {
  signal: fetchSignal,
  meta: options?.meta,
  onProgress: (intermediateData: unknown) => {
    cache.set(port, params, intermediateData);
  },
};
```

And in the `.mapErr()` handler, detect timeout and produce the proper error:

```typescript
.mapErr(error => {
  decrementFetching(port.__portName);
  if (isAbortError(error)) {
    cancellationControllers.delete(serialized);
    // NEW: distinguish timeout from cancellation
    if (isTimeoutError(error)) {
      emitEvent({ type: "fetch-error", portName: port.__portName, params,
        durationMs: clock.now() - startTime, errorTag: "QueryTimeout" });
      tracingHook?.onFetchEnd(port.__portName, false);
      return queryTimeout(port.__portName, params, timeoutMs);
    }
    emitEvent({ type: "fetch-cancelled", portName: port.__portName, params });
    tracingHook?.onFetchEnd(port.__portName, false);
    return queryCancelled(port.__portName, params);
  }
  // ... rest unchanged
```

Add the timeout detection helper:

```typescript
function isTimeoutError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "TimeoutError") return true;
  if (typeof error === "object" && error !== null && "_tag" in error && "cause" in error) {
    if (error._tag === "QueryFetchFailed") {
      return isTimeoutError(error.cause);
    }
  }
  return false;
}
```

### Change 10: Add Cache Encryption Hooks to PersistenceConfig

**File:** `libs/query/core/src/persistence/persistence-manager.ts`
**Lines:** 19-23 (PersistenceConfig interface)

**Rationale:** Rather than implementing a specific encryption algorithm (which would introduce cryptographic dependencies), provide pluggable `encrypt`/`decrypt` hooks that consumers can implement with their chosen algorithm. This follows the port/adapter pattern already used throughout the library.

**Change:**

```typescript
export interface PersistenceConfig {
  readonly persister: CachePersister;
  readonly buster: string;
  readonly maxAge: number;

  // NEW: Optional encryption hooks for sensitive data at rest.
  // When provided, all data is encrypted before persistence and decrypted on restore.
  readonly encrypt?: (data: string) => string | Promise<string>;
  readonly decrypt?: (encrypted: string) => string | Promise<string>;
}
```

**File:** `libs/query/core/src/persistence/persistence-manager.ts`
**Lines:** 105-120 (createListener function)

**Change:** The listener must serialize entry data to JSON, encrypt, and wrap in a container before calling `persister.persistQuery()`. On restore, decrypt and deserialize.

The `createListener()` and `restore()` functions must apply the encrypt/decrypt hooks:

```typescript
function createListener(): CacheListener {
  return event => {
    switch (event.type) {
      case "added":
      case "updated": {
        if (config.encrypt) {
          const serialized = JSON.stringify(event.entry);
          void Promise.resolve(config.encrypt(serialized)).then(encrypted => {
            const wrappedEntry: CacheEntry<unknown, unknown> = {
              ...event.entry,
              data: encrypted,
              error: null,
            };
            void persister.persistQuery(event.key, wrappedEntry);
          });
        } else {
          void persister.persistQuery(event.key, event.entry);
        }
        break;
      }
      // ... rest unchanged
    }
  };
}
```

And in `restore()`:

```typescript
for (const [key, entry] of entries) {
  if (key[0] === BUSTER_PORT_NAME) continue;
  if (entry.dataUpdatedAt !== undefined && now - entry.dataUpdatedAt > maxAge) continue;

  let data = entry.data;
  if (config.decrypt && typeof data === "string") {
    data = JSON.parse(await config.decrypt(data));
  }
  cache.set({ __portName: key[0] }, deserializeParams(key), data);
}
```

### Change 11: Add GC Staleness Check on Cache Read

**File:** `libs/query/core/src/cache/query-cache.ts`
**Lines:** 230-235 (get method)

**Rationale:** Between GC sweeps, expired entries can be served. Adding a staleness check on read ensures entries past `cacheTime` with no subscribers are proactively removed, tightening the non-determinism window.

**Change:** Add an inline expiry check in `cache.get()`:

```typescript
get(port: PortLike, params: unknown): CacheEntrySnapshot | undefined {
  const serialized = getSerializedKey(port, params);
  const entry = entries.get(serialized);
  if (entry === undefined) return undefined;

  // NEW: Proactive expiry check for entries with no subscribers
  if (!hasSubscribers(entry)) {
    const cacheTime = DEFAULT_QUERY_OPTIONS.cacheTime;
    const now = clock.now();
    const dataUpdatedAt = entry.dataUpdatedAt$.peek();
    const errorUpdatedAt = entry.errorUpdatedAt$.peek();
    const isExpired =
      (dataUpdatedAt !== undefined && now - dataUpdatedAt > cacheTime) ||
      (errorUpdatedAt !== undefined && now - errorUpdatedAt > cacheTime);
    if (isExpired) {
      const key = keyMap.get(serialized);
      entries.delete(serialized);
      keyMap.delete(serialized);
      if (key) {
        emit({ type: "removed", key });
      }
      return undefined;
    }
  }

  return getSnapshot(entry);
},
```

### Change 12: Add Structured Error Cause Classification

**File:** `libs/query/core/src/types/errors.ts`
**Lines:** 23-29 (QueryFetchFailed interface)

**Rationale:** The `cause: unknown` field makes downstream error handling fragile. Adding a `causeClassification` field provides structured metadata while keeping `cause` for full diagnostic access.

**Change:**

```typescript
export type ErrorCauseClassification =
  | "network"
  | "timeout"
  | "abort"
  | "server"
  | "parse"
  | "validation"
  | "unknown";

export interface QueryFetchFailed {
  readonly _tag: "QueryFetchFailed";
  readonly portName: string;
  readonly params: unknown;
  readonly retryAttempt: number;
  readonly cause: unknown;
  readonly causeClassification: ErrorCauseClassification; // NEW
}
```

Update the constructor to classify the cause:

```typescript
function classifyCause(cause: unknown): ErrorCauseClassification {
  if (cause instanceof DOMException) {
    if (cause.name === "AbortError") return "abort";
    if (cause.name === "TimeoutError") return "timeout";
  }
  if (cause instanceof TypeError && typeof cause.message === "string") {
    if (cause.message.includes("fetch") || cause.message.includes("network")) return "network";
  }
  if (typeof cause === "object" && cause !== null && "_tag" in cause) {
    const tagged = cause;
    if (tagged._tag === "QueryValidationFailed") return "validation";
  }
  return "unknown";
}

export function queryFetchFailed(
  portName: string,
  params: unknown,
  retryAttempt: number,
  cause: unknown
): QueryFetchFailed {
  return _queryFetchFailed({
    portName,
    params,
    retryAttempt,
    cause,
    causeClassification: classifyCause(cause),
  });
}
```

### Change 13: Add FetchContext CSRF Token Support

**File:** `libs/query/core/src/ports/types.ts`
**Lines:** 32-51 (FetchContext interface)

**Rationale:** While CSRF protection is typically handled at the transport layer, providing a standardized field in `FetchContext` enables adapters to access CSRF tokens without ad-hoc conventions.

**Change:**

```typescript
export interface FetchContext {
  readonly signal: AbortSignal;
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly pageParam?: unknown;
  readonly direction?: "forward" | "backward";
  readonly onProgress?: (intermediateData: unknown) => void;

  // NEW: Optional CSRF token for adapters that need transport-level protection.
  // Populated from QueryClientConfig.csrfTokenProvider when configured.
  readonly csrfToken?: string;
}
```

**File:** `libs/query/core/src/client/query-client.ts`

**Change:** Add an optional `csrfTokenProvider` to `QueryClientConfig`:

```typescript
export interface QueryClientConfig {
  readonly container: QueryContainer;
  readonly clock?: Clock;
  readonly defaults?: Partial<QueryDefaults>;
  readonly maxInvalidationDepth?: number;
  readonly tracingHook?: QueryTracingHook;
  readonly tracer?: TracerLike;
  readonly persister?: {
    readonly persister: CachePersister;
    readonly buster: string;
    readonly maxAge: number;
  };

  // NEW: Optional CSRF token provider.
  readonly csrfTokenProvider?: () => string | undefined;
}
```

And thread it into `FetchContext` in `doFetch()`:

```typescript
const fetchContext: FetchContext = {
  signal: fetchSignal,
  meta: options?.meta,
  csrfToken: config.csrfTokenProvider?.(), // NEW
  onProgress: (intermediateData: unknown) => {
    cache.set(port, params, intermediateData);
  },
};
```

---

## 4. New Code to Implement

### 4.1 QueryValidationFailed Error Variant

**New in:** `libs/query/core/src/types/errors.ts`

```typescript
export interface QueryValidationFailed {
  readonly _tag: "QueryValidationFailed";
  readonly portName: string;
  readonly params: unknown;
  readonly cause: unknown;
}

const _queryValidationFailed = createError("QueryValidationFailed");
export function queryValidationFailed(
  portName: string,
  params: unknown,
  cause: unknown
): QueryValidationFailed {
  return _queryValidationFailed({ portName, params, cause });
}
```

### 4.2 ErrorCauseClassification Type

**New in:** `libs/query/core/src/types/errors.ts`

```typescript
export type ErrorCauseClassification =
  | "network"
  | "timeout"
  | "abort"
  | "server"
  | "parse"
  | "validation"
  | "unknown";
```

### 4.3 classifyCause Helper

**New in:** `libs/query/core/src/types/errors.ts`

```typescript
export function classifyCause(cause: unknown): ErrorCauseClassification {
  if (cause instanceof DOMException) {
    if (cause.name === "AbortError") return "abort";
    if (cause.name === "TimeoutError") return "timeout";
  }
  if (cause instanceof TypeError && typeof cause.message === "string") {
    const msg = cause.message.toLowerCase();
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
      return "network";
    }
  }
  if (typeof cause === "object" && cause !== null && "_tag" in cause) {
    if (cause._tag === "QueryValidationFailed") return "validation";
  }
  return "unknown";
}
```

### 4.4 isTimeoutError Helper

**New in:** `libs/query/core/src/client/query-client.ts`

```typescript
function isTimeoutError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "TimeoutError") return true;
  if (typeof error === "object" && error !== null && "_tag" in error && "cause" in error) {
    if (error._tag === "QueryFetchFailed") {
      return isTimeoutError(error.cause);
    }
  }
  return false;
}
```

### 4.5 Correlation ID Generator

**New in:** `libs/query/core/src/client/query-client.ts`

```typescript
let correlationCounter = 0;
function nextCorrelationId(): string {
  return `qc-${++correlationCounter}`;
}
```

### 4.6 Tracing Warning

**New in:** `libs/query/core/src/client/query-client.ts`

```typescript
let tracingWarningEmitted = false;

function warnNoTracing(): void {
  if (tracingHook !== undefined || tracingWarningEmitted) return;
  tracingWarningEmitted = true;
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      "[@hex-di/query] QueryClient created without tracing configured. " +
        "Query operations will not produce distributed tracing spans. " +
        "For GxP compliance, configure `tracer` or `tracingHook` in QueryClientConfig."
    );
  }
}
```

### 4.7 Dehydration Version Constant and Guard

**New in:** `libs/query/core/src/client/dehydration.ts`

```typescript
const CURRENT_DEHYDRATION_VERSION = 3;

// In hydrate():
if (state.version !== CURRENT_DEHYDRATION_VERSION) {
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      `[@hex-di/query] Ignoring dehydrated state: version ${String(state.version)} ` +
        `is not compatible with current version ${CURRENT_DEHYDRATION_VERSION}. ` +
        `No migration path exists for older versions.`
    );
  }
  return;
}
```

---

## 5. Test Requirements

Each change requires corresponding test coverage. Below is the minimum test matrix.

### 5.1 Response Validation Tests

**File:** `libs/query/core/tests/response-validation.test.ts` (new)

| Test                                                                   | Description                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `validate: passes valid data through to cache`                         | Port with `validate` that returns narrowed data; verify cache stores the validated value   |
| `validate: rejects invalid data with QueryValidationFailed`            | Port with `validate` that throws; verify `fetchQuery` returns `Err(QueryValidationFailed)` |
| `validate: stores error in cache on validation failure`                | Verify `cache.get()` returns error entry after validation failure                          |
| `validate: emits fetch-error event with QueryValidationFailed tag`     | Verify event listener receives `errorTag: "QueryValidationFailed"`                         |
| `validate: called with raw adapter data, not structurally-shared data` | Ensure the validator receives the original data, not a structurally-shared reference       |
| `validate: port without validate stores data as-is`                    | Backward compatibility: no validate = no change in behavior                                |
| `validate: tracing hook receives false on validation failure`          | Verify `onFetchEnd(portName, false)` is called                                             |

### 5.2 Tracing Warning Tests

**File:** `libs/query/core/tests/tracing-warning.test.ts` (new)

| Test                                                 | Description                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `emits console.warn once when no tracing configured` | Create client without tracer; call fetchQuery twice; verify warn called exactly once |
| `does not warn when tracingHook is provided`         | Create client with tracingHook; call fetchQuery; verify no warn                      |
| `does not warn when tracer is provided`              | Create client with tracer; call fetchQuery; verify no warn                           |
| `warning includes actionable guidance text`          | Verify message mentions `tracingHook` and `QueryClientConfig`                        |

### 5.3 Correlation ID Tests

**File:** `libs/query/core/tests/correlation-id.test.ts` (new)

| Test                                                                 | Description                                                                         |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `fetch-started and fetch-completed share the same correlationId`     | Subscribe to events; trigger fetch; verify both events have matching ID             |
| `concurrent fetches have distinct correlationIds`                    | Trigger two fetches; verify different IDs                                           |
| `retry events carry the same correlationId as the originating fetch` | Trigger a failing fetch with retries; verify all retry events share the original ID |
| `correlationId is monotonically increasing`                          | Parse numeric suffix; verify ordering                                               |

### 5.4 Dehydration Version Tests

**File:** `libs/query/core/tests/dehydration-version.test.ts` (new)

| Test                                                        | Description                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `hydrate accepts version 3 state`                           | Standard hydration works                                                              |
| `hydrate rejects version 2 state with warning`              | Pass `{ version: 2, queries: [...] }`; verify cache untouched and console.warn called |
| `hydrate rejects version 1 state with warning`              | Same as above for v1                                                                  |
| `hydrate rejects version 99 state with warning`             | Future version; verify rejection                                                      |
| `warning includes both actual and expected version numbers` | Verify message content                                                                |

### 5.5 stableStringify Warning Tests

**File:** `libs/query/core/tests/stable-stringify-warning.test.ts` (new)

| Test                                                        | Description                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `warns once for function params`                            | Pass a function; verify warn called once; pass another function; verify still only one warn |
| `warns once for Symbol params`                              | Pass a Symbol; verify warn                                                                  |
| `warns once for Date params`                                | Pass a Date; verify warn                                                                    |
| `warns once for Map params`                                 | Pass a Map; verify warn                                                                     |
| `does not warn for plain objects, arrays, strings, numbers` | Pass normal values; verify no warn                                                          |

### 5.6 Timeout Enforcement Tests

**File:** `libs/query/core/tests/timeout-enforcement.test.ts` (new)

| Test                                                      | Description                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `fetch times out after default timeout`                   | Create client with `timeout: 100`; adapter delays 500ms; verify `QueryTimeout` error |
| `timeout: 0 disables timeout enforcement`                 | Create client with `timeout: 0`; adapter delays 100ms; verify success                |
| `port-level timeout overrides client default`             | Client `timeout: 5000`; port `defaults.timeout: 100`; verify port timeout applies    |
| `timeout error includes correct timeoutMs`                | Verify `QueryTimeout.timeoutMs` matches configured value                             |
| `timeout emits fetch-error event with QueryTimeout tag`   | Verify event                                                                         |
| `user-provided AbortSignal still works alongside timeout` | Pass manual signal; abort before timeout; verify `QueryCancelled` not `QueryTimeout` |

### 5.7 Cache Encryption Tests

**File:** `libs/query/core/tests/cache-encryption.test.ts` (new)

| Test                                                           | Description                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `encrypt hook is called on persist`                            | Provide `encrypt` spy; set cache data; verify spy called with serialized entry |
| `decrypt hook is called on restore`                            | Provide `decrypt` spy; restore from persister; verify spy called               |
| `round-trip: encrypt then decrypt produces original data`      | Use base64 encrypt/decrypt; verify restored data matches original              |
| `persister receives encrypted data, not plaintext`             | Verify the `persistQuery` call receives the encrypted value                    |
| `no encryption hooks = data persisted as-is (backward compat)` | Omit hooks; verify no change in behavior                                       |

### 5.8 GC Staleness on Read Tests

**File:** `libs/query/core/tests/gc-staleness-read.test.ts` (new)

| Test                                                                  | Description                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `cache.get returns undefined for expired entries without subscribers` | Set entry; advance clock past cacheTime; verify `get()` returns undefined |
| `cache.get returns data for expired entries WITH subscribers`         | Increment subscribers; advance clock; verify `get()` still returns data   |
| `expired entry is removed on read (emits removed event)`              | Subscribe to events; read expired entry; verify `removed` event emitted   |

### 5.9 Structured Error Cause Tests

**File:** `libs/query/core/tests/error-cause-classification.test.ts` (new)

| Test                                                  | Description          |
| ----------------------------------------------------- | -------------------- |
| `classifies DOMException AbortError as "abort"`       | Verify               |
| `classifies DOMException TimeoutError as "timeout"`   | Verify               |
| `classifies TypeError with "fetch" as "network"`      | Verify               |
| `classifies QueryValidationFailed as "validation"`    | Verify               |
| `classifies unknown objects as "unknown"`             | Verify               |
| `queryFetchFailed includes causeClassification field` | Construct and verify |

---

## 6. Migration Notes

### 6.1 QueryPortConfig.validate (Additive, Non-Breaking)

The `validate` field is optional. Existing port definitions are unaffected. Migration path:

1. Add `validate` to ports that handle GxP-sensitive data.
2. Validators should use runtime type-checking libraries (Zod, Valibot, ArkType) or manual checks.
3. Example:

```typescript
const userPort = createQueryPort<User, string>()({
  name: "user",
  validate: data => {
    if (typeof data !== "object" || data === null) throw new Error("Expected object");
    if (!("id" in data) || typeof data.id !== "string") throw new Error("Missing id");
    if (!("name" in data) || typeof data.name !== "string") throw new Error("Missing name");
    return data as User; // Note: in actual code, use proper validation, not cast
  },
});
```

### 6.2 QueryResolutionError Union (Breaking for Exhaustive Pattern Matches)

Adding `QueryValidationFailed` to the union means existing exhaustive `switch` or `match` statements on `_tag` will fail at compile time. This is desirable -- it forces consumers to handle the new error case.

**Migration:** Add a case for `"QueryValidationFailed"` in all exhaustive handlers.

### 6.3 QueryFetchFailed.causeClassification (Breaking for Object Spread)

Adding `causeClassification` to `QueryFetchFailed` is technically non-breaking for readers (the field simply appears), but code that constructs `QueryFetchFailed` objects manually (outside of the `queryFetchFailed()` factory) will fail type-checking.

**Migration:** Use the `queryFetchFailed()` constructor, which automatically classifies.

### 6.4 QueryDefaults.timeout (Behavioral Change)

The default timeout of 30 seconds means existing fetches that previously had no timeout will now be aborted after 30s. This could break long-running queries.

**Migration:** Set `timeout: 0` in `QueryClientConfig.defaults` to restore the old behavior, or increase the timeout for specific ports via `port.config.defaults.timeout`.

### 6.5 QueryClientEvent.correlationId (Breaking for Event Consumers)

All event types gain a mandatory `correlationId` field. Existing event listeners that destructure events or check specific shapes may need updates.

**Migration:** Access `event.correlationId` in existing listeners. For listeners that don't need it, no change is required (the field is simply present).

### 6.6 CacheEvent.correlationId (Non-Breaking, Optional Field)

The `correlationId` field on `CacheEvent` is optional (`correlationId?: string`). Existing listeners are unaffected.

### 6.7 Dehydration Version Rejection (Behavioral Change)

`hydrate()` will now reject non-v3 states instead of silently processing them. If any application currently hydrates v1/v2 states, they will stop receiving that data.

**Migration:** Re-export server-side state using the current `dehydrate()` function to produce v3 payloads.

### 6.8 PersistenceConfig.encrypt/decrypt (Additive, Non-Breaking)

The new fields are optional. Existing persistence configurations work unchanged.

### 6.9 GC Staleness on Read (Behavioral Change)

`cache.get()` for unsubscribed expired entries now returns `undefined` instead of stale data. Code that relied on reading expired entries between GC sweeps will see different behavior.

**Migration:** If stale data is intentionally needed, ensure the entry has subscribers (observers attached), which prevents the proactive expiry check.

### 6.10 FetchContext.csrfToken (Additive, Non-Breaking)

The field is optional. Existing adapters ignore it.

---

## 7. Tracing Warning Strategy

### Principles

1. **Tracing remains strictly optional.** The `QueryTracingHook` system (`tracingHook` / `tracer` config fields) is never required. No operation blocks, fails, or degrades when tracing is absent.

2. **One-time console.warn per QueryClient instance.** The warning is emitted exactly once -- on the first `doFetch()` or `mutate()` call -- not on construction. This avoids warnings for QueryClient instances that are created but never used (e.g., in test scaffolding).

3. **Warning is suppressible.** Applications that intentionally run without tracing can suppress the warning by:
   - Providing a no-op tracer: `{ pushSpan() {}, popSpan() {} }`
   - Providing a no-op tracing hook: `{ onFetchStart() {}, onFetchEnd() {}, onMutationStart() {}, onMutationEnd() {} }`

4. **Message is actionable.** The warning text includes the specific config fields to set (`tracer` or `tracingHook`) and references GxP compliance.

### Implementation Location

**File:** `libs/query/core/src/client/query-client.ts`
**Location:** Inside `createQueryClient()` closure, after tracing hook resolution (line 303).

### Implementation Detail

```typescript
// After line 303 (tracingHook resolution)
let tracingWarningEmitted = false;

function warnNoTracing(): void {
  if (tracingHook !== undefined || tracingWarningEmitted) return;
  tracingWarningEmitted = true;
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      "[@hex-di/query] QueryClient created without tracing configured. " +
        "Query operations will not produce distributed tracing spans. " +
        "For GxP compliance, configure `tracer` or `tracingHook` in QueryClientConfig."
    );
  }
}
```

### Call Sites

1. **`doFetch()`** -- line 462, immediately after the function body opens (before `assertNotDisposed`)
2. **`mutate()`** -- line 698, immediately after the function body opens (before `assertNotDisposed`)

Both call `warnNoTracing()` which is a no-op after the first emission.

### Environment Compatibility

- Uses `typeof console !== "undefined"` guard for environments without console (Web Workers, some test runners).
- Uses `console.warn` specifically (not `console.error` or `console.log`) to indicate advisory severity.
- Does not use `console.trace()` to avoid noisy stack traces.

### Testing Strategy

- Mock `console.warn` in tests.
- Verify single emission across multiple fetch/mutate calls.
- Verify no emission when `tracer` or `tracingHook` is provided.
- Verify the message contains `"tracer"` and `"tracingHook"` and `"GxP"`.

---

## Summary of All Files Affected

| File                                                       | Type of Change | Scope                                                                                                           |
| ---------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `libs/query/core/src/ports/query-port.ts`                  | Modified       | Add `validate` to `QueryPortConfig`                                                                             |
| `libs/query/core/src/ports/types.ts`                       | Modified       | Add `csrfToken` to `FetchContext`                                                                               |
| `libs/query/core/src/types/errors.ts`                      | Modified       | Add `QueryValidationFailed`, `ErrorCauseClassification`, `causeClassification` to `QueryFetchFailed`            |
| `libs/query/core/src/types/options.ts`                     | Modified       | Add `timeout` to `QueryDefaults` and `DEFAULT_QUERY_OPTIONS`                                                    |
| `libs/query/core/src/client/query-client.ts`               | Modified       | Validation in doFetch, tracing warning, correlation IDs, timeout enforcement, CSRF token, isTimeoutError helper |
| `libs/query/core/src/client/dehydration.ts`                | Modified       | Version check in `hydrate()`, parseParamsHash warning                                                           |
| `libs/query/core/src/cache/query-cache.ts`                 | Modified       | Proactive expiry in `get()`, optional `correlationId` on `CacheEvent`                                           |
| `libs/query/core/src/cache/stable-stringify.ts`            | Modified       | Non-serializable value warnings                                                                                 |
| `libs/query/core/src/persistence/persistence-manager.ts`   | Modified       | Add `encrypt`/`decrypt` hooks to `PersistenceConfig`                                                            |
| `libs/query/core/src/index.ts`                             | Modified       | Export new types (`QueryValidationFailed`, `ErrorCauseClassification`, etc.)                                    |
| `libs/query/core/tests/response-validation.test.ts`        | New            | 7 tests                                                                                                         |
| `libs/query/core/tests/tracing-warning.test.ts`            | New            | 4 tests                                                                                                         |
| `libs/query/core/tests/correlation-id.test.ts`             | New            | 4 tests                                                                                                         |
| `libs/query/core/tests/dehydration-version.test.ts`        | New            | 5 tests                                                                                                         |
| `libs/query/core/tests/stable-stringify-warning.test.ts`   | New            | 5 tests                                                                                                         |
| `libs/query/core/tests/timeout-enforcement.test.ts`        | New            | 6 tests                                                                                                         |
| `libs/query/core/tests/cache-encryption.test.ts`           | New            | 5 tests                                                                                                         |
| `libs/query/core/tests/gc-staleness-read.test.ts`          | New            | 3 tests                                                                                                         |
| `libs/query/core/tests/error-cause-classification.test.ts` | New            | 6 tests                                                                                                         |

**Total:** 9 modified files, 9 new test files (45 tests minimum).

---

## Score Impact Analysis

| #   | Criterion           | Before | After | Changes Applied                                                                |
| --- | ------------------- | ------ | ----- | ------------------------------------------------------------------------------ |
| 1   | Data Integrity      | 8      | 10    | Response validation (Change 1-3), structured error cause (Change 12)           |
| 2   | Traceability        | 7      | 10    | Tracing warning (Change 4), correlation IDs (Change 5)                         |
| 3   | Determinism         | 9      | 10    | stableStringify warning (Change 8), GC staleness on read (Change 11)           |
| 4   | Error Handling      | 9      | 10    | Timeout enforcement (Change 9), error cause classification (Change 12)         |
| 5   | Validation          | 5      | 10    | Response schema validation (Changes 1-3), stableStringify warning (Change 8)   |
| 6   | Change Control      | 7      | 10    | Dehydration version check (Change 6), parseParamsHash warning (Change 7)       |
| 7   | Testing             | 9      | 10    | 45 new tests across 9 files (Section 5)                                        |
| 8   | Security            | 5      | 10    | Cache encryption hooks (Change 10), CSRF token (Change 13), timeout (Change 9) |
| 9   | Documentation       | 8      | 10    | Inline JSDoc for all new fields, warning messages with actionable guidance     |
| 10  | Compliance-Specific | 8      | 10    | All above changes combined                                                     |

**Projected final score: 10 / 10**
