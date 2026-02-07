# 07 - Cache Architecture

## 26. Cache Key Structure

Cache keys uniquely identify query results. A key is a tuple of the port name and a deterministic hash of the parameters:

```typescript
/**
 * Branded cache key type. The unique symbol prevents construction of
 * CacheKey values outside of `createCacheKey`, ensuring every key
 * passes through deterministic serialization via `stableStringify`.
 *
 * Without branding, a plain `readonly [string, string]` tuple could
 * be constructed ad-hoc, bypassing key normalization and causing
 * cache misses for equivalent parameters.
 */
declare const __cacheKeyBrand: unique symbol;

type CacheKey<TName extends string = string> = readonly [portName: TName, paramsHash: string] & {
  readonly [__cacheKeyBrand]: true;
};
```

### Key Generation

```typescript
/**
 * The only sanctioned way to create a CacheKey. Ensures deterministic
 * parameter serialization via `stableStringify`.
 */
function createCacheKey<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams
): CacheKey<TName> {
  return [port.name, stableStringify(params)] as CacheKey<TName>;
}
```

`stableStringify` produces a deterministic JSON string regardless of key insertion order:

```typescript
// These produce the same paramsHash:
stableStringify({ role: "admin", page: 1 });
stableStringify({ page: 1, role: "admin" });
// Both: '{"page":1,"role":"admin"}'
```

### paramsHash Algorithm

The `paramsHash` is the deterministic string representation of query parameters. The
algorithm prioritizes **human-readability** and **debuggability** over compactness:

1. **Sort keys recursively.** For every plain object in the params tree, sort keys
   lexicographically. Arrays preserve insertion order.
2. **JSON.stringify the sorted structure.** This produces a deterministic string.
3. **Use the string directly as `paramsHash`.** No hashing is applied -- the raw JSON
   string IS the cache key's second element. This means cache keys are human-readable
   in devtools, logs, and MCP resource dumps.
4. **Future opt-in hashing.** For params objects that serialize to > 1KB, a future
   option may apply SHA-256 and store the hash instead. This is not part of v0.1.0.

#### Pseudocode

```typescript
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }

  const sortedKeys = Object.keys(value).sort();
  const pairs = sortedKeys.map(
    key => JSON.stringify(key) + ":" + stableStringify((value as Record<string, unknown>)[key])
  );
  return "{" + pairs.join(",") + "}";
}
```

#### Key Properties

- **Deterministic:** Same input always produces same output, regardless of key insertion order.
- **Human-readable:** Cache keys like `["Users", '{"page":1,"role":"admin"}']` are
  directly inspectable in logs, devtools, and error messages.
- **Consistent with HexDI patterns:** The `inspectionToJSON()` functions in `@hex-di/graph`
  use the same principle -- structured data serialized for human consumption, not opaque hashes.

### No Cache Normalization

HexDI Query **does not** implement a normalized cache. Each `[portName, paramsHash]`
stores the full response independently. This is an explicit design choice:

- **Unlike Apollo Client**, which normalizes all entities by `__typename + id` into a
  flat store, HexDI Query treats each cache entry as a self-contained value.
- **No identity conflicts:** Two queries returning the same entity with different field
  selections never conflict. There is no merge logic, no field policy configuration.
- **Simplicity:** Developers reason about cache entries as "the result of calling this
  port with these params." There is no hidden normalization layer that might rewrite
  or merge data.
- **Predictability:** Updating one query's cache never silently affects another query's
  cache. Cross-query consistency is handled explicitly via mutation effects
  (see [04 - Mutation Ports, Section 17](./04-mutation-ports.md#17-mutation-effects)).

**Trade-off:** Duplicate data across entries. If `UsersPort({})` and `UserByIdPort({ id: "1" })`
both contain user `"1"`, updating one does not update the other. Mutation effects handle
this by invalidating affected ports after mutations. For applications where normalized
caching is essential (e.g., complex GraphQL schemas with deep entity relationships),
Apollo Client remains the better fit. See [Appendix C10](./15-appendices.md#c10-why-no-cache-normalization-and-the-paramshash-algorithm-choice).

### Key Examples

```
["Users", '{"role":"admin"}']
["UserById", '{"id":"123"}']
["CurrentUser", '{}']
["Products", '{"category":"electronics","page":2}']
```

### Port Name as Key Prefix

Unlike string-array keys in TanStack Query, HexDI Query uses the port name as the first element. This provides:

- **Uniqueness** -- port names are unique in the graph
- **Grouping** -- all queries for a port share the prefix
- **Invalidation** -- invalidate all `UsersPort` queries by matching the prefix
- **Type safety** -- the port type constrains the params type

## 27. Cache Entry

The `result` field is the **source of truth** for the last fetch outcome. The `data` and
`error` fields are derived from `result` for ergonomic access.

```typescript
interface CacheEntry<TData, TError = Error> {
  /**
   * Source of truth for the last fetch outcome.
   * `undefined` when the entry exists but no fetch has completed yet (pending state).
   */
  readonly result: Result<TData, TError> | undefined;

  /**
   * Derived from result: `result?.isOk() ? result.value : undefined`.
   * Provided for ergonomic access -- consumers that only need the success
   * value can read `entry.data` without unwrapping the Result.
   */
  readonly data: TData | undefined;

  /**
   * Derived from result: `result?.isErr() ? result.error : null`.
   * Provided for ergonomic access -- consumers that only need the error
   * can read `entry.error` without unwrapping the Result.
   */
  readonly error: TError | null;

  /** Current status */
  readonly status: "pending" | "success" | "error";

  /** Timestamp when data was last fetched successfully (ms since epoch) */
  readonly dataUpdatedAt: number | undefined;

  /** Timestamp when error was last set (ms since epoch) */
  readonly errorUpdatedAt: number | undefined;

  /** Number of times this query has been fetched */
  readonly fetchCount: number;

  /** Number of active observers (components subscribed) */
  readonly observerCount: number;

  /** Whether this entry is marked as invalidated */
  readonly isInvalidated: boolean;
}
```

### Entry Lifecycle

```
┌──────────┐     fetch()      ┌───────────────┐
│  absent  │─────────────────>│   pending     │
│  (no     │                  │ result: undef │
│  entry)  │                  │ data: undef   │
└──────────┘                  │ error: undef  │
                              └──────┬────────┘
                                     │
                      ┌──────────────┴──────────────┐
                      │                              │
                      ▼                              ▼
                ┌───────────────┐             ┌───────────────┐
                │   success     │             │    error      │
                │ result: Ok(T) │             │ result: Err(E)│
                │ data: T       │             │ error: E      │
                │ error: undef  │             │ data: undef   │
                └──────┬────────┘             └──────┬────────┘
                       │                              │
                       │     invalidate()             │
                       │◀─────────────────────────────┤
                       │     refetch()                │
                       │                              │
                       ▼                              │
                ┌───────────────┐                     │
                │   refetch     │                     │
                │ result: Ok(T) │  (keeps prev Ok)    │
                │ data: T       │─────────────────────┘
                │ fetching      │
                └───────────────┘
```

## 28. QueryCache Interface

```typescript
interface QueryCache {
  // === Read Operations ===

  /** Get cache entry for a query */
  get<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): CacheEntry<TData, TError> | undefined;

  /** Check if query has data in cache */
  has<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): boolean;

  /** Get all cache entries */
  getAll(): ReadonlyMap<string, CacheEntry<unknown, unknown>>;

  /** Find entries matching a port (all param variations) */
  findByPort<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>
  ): ReadonlyArray<[CacheKey, CacheEntry<TData, TError>]>;

  /** Find entries matching predicate */
  find(
    predicate: (entry: CacheEntry<unknown, unknown>, key: CacheKey) => boolean
  ): ReadonlyArray<[CacheKey, CacheEntry<unknown, unknown>]>;

  // === Write Operations ===

  /** Set data for a query */
  set<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    data: TData
  ): void;

  /** Set error for a query */
  setError<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    error: TError
  ): void;

  /** Mark query as invalidated (will refetch on next access) */
  invalidate<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;

  /** Remove query from cache entirely */
  remove<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;

  /** Clear all entries from cache */
  clear(): void;

  // === Subscriptions ===

  /** Subscribe to all cache changes */
  subscribe(listener: CacheListener): Unsubscribe;

  // === Metrics ===

  /** Number of entries in cache */
  readonly size: number;
}

type Unsubscribe = () => void;
```

### Cache Events

```typescript
type CacheEvent =
  | { readonly type: "added"; readonly key: CacheKey; readonly entry: CacheEntry<unknown, unknown> }
  | {
      readonly type: "updated";
      readonly key: CacheKey;
      readonly entry: CacheEntry<unknown, unknown>;
    }
  | { readonly type: "removed"; readonly key: CacheKey }
  | { readonly type: "invalidated"; readonly key: CacheKey }
  | { readonly type: "cleared" };

type CacheListener = (event: CacheEvent) => void;
```

## 29. Structural Sharing

When new data arrives from a fetch, the cache applies **structural sharing** (`replaceEqualDeep`) to preserve reference equality for unchanged portions of the data tree. This prevents unnecessary re-renders in React.

### How It Works

Structural sharing applies to the `Ok.value` of the `Result`. When a new `ok(newData)` result
arrives, the cache compares `newData` against the previous `Ok.value` (if the previous result
was also `Ok`) using `replaceEqualDeep`. This means reference equality is preserved for
unchanged portions of the success data, while the `Result` wrapper itself is always a new
instance.

```typescript
// Inside cache update logic:
if (prevEntry.result?.isOk() && newResult.isOk()) {
  const sharedValue = replaceEqualDeep(prevEntry.result.value, newResult.value);
  // If sharedValue === prevEntry.result.value, the data is unchanged
  // Observers can skip re-render via referential equality check on .data
}
```

```typescript
function replaceEqualDeep<T>(prev: T, next: T): T {
  // If values are referentially equal, return prev
  if (prev === next) return prev;

  // If both are arrays
  if (Array.isArray(prev) && Array.isArray(next)) {
    // If lengths differ or any element differs structurally, rebuild
    // But reuse elements that haven't changed
    const result = next.map((item, i) =>
      i < prev.length ? replaceEqualDeep(prev[i], item) : item
    );
    // If all elements are referentially the same, return prev array
    if (result.length === prev.length && result.every((item, i) => item === prev[i])) {
      return prev;
    }
    return result;
  }

  // If both are plain objects
  if (isPlainObject(prev) && isPlainObject(next)) {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    // If key sets differ, rebuild with shared values
    // If all values are referentially same, return prev
    // ...
  }

  // Primitives or different types: return next
  return next;
}
```

### Example

```typescript
const prev = [
  { id: "1", name: "Alice", role: "admin" },
  { id: "2", name: "Bob", role: "user" },
];

const next = [
  { id: "1", name: "Alice", role: "admin" }, // unchanged
  { id: "2", name: "Bob", role: "manager" }, // role changed
];

const result = replaceEqualDeep(prev, next);

result[0] === prev[0]; // true -- reference preserved (no re-render)
result[1] === prev[1]; // false -- role changed (triggers re-render)
result === prev; // false -- array itself is new
```

### Opt-Out

Structural sharing can be disabled per-query when not needed (e.g., for large datasets where the comparison cost outweighs the benefit):

```typescript
useQuery(LargeDataPort, params, { structuralSharing: false });
```

## 30. Garbage Collection

Unused cache entries are automatically cleaned up to prevent memory leaks.

### GC Rules

An entry is eligible for garbage collection when:

1. `observerCount === 0` (no active components subscribed)
2. `Date.now() - dataUpdatedAt > cacheTime` (exceeded the port's cacheTime)

### GC Configuration

```typescript
interface GarbageCollectorConfig {
  /** Interval between GC runs in ms (default: 60_000) */
  readonly interval: number;

  /** Whether GC is enabled (default: true) */
  readonly enabled: boolean;
}
```

### Injectable Time Source (Clock Port)

Staleness checks and GC timers use `Date.now()` internally. This makes tests
non-deterministic and requires `vi.useFakeTimers()` workarounds.

To avoid this, the QueryClient accepts an optional `Clock` port for time control:

```typescript
interface Clock {
  /** Returns current time in milliseconds since epoch */
  readonly now: () => number;
}

const ClockPort = createPort<Clock>()({
  name: "Clock",
  direction: "outbound",
});

/** Default adapter: delegates to Date.now() */
const SystemClockAdapter = createAdapter({
  provides: ClockPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ now: () => Date.now() }),
});
```

In tests, a controllable clock replaces the system clock:

```typescript
const TestClockAdapter = createAdapter({
  provides: ClockPort,
  requires: [],
  lifetime: "singleton",
  factory: () => {
    let time = 0;
    return {
      now: () => time,
      advance: (ms: number) => {
        time += ms;
      },
      set: (ms: number) => {
        time = ms;
      },
    };
  },
});
```

The `QueryClient` uses `Clock.now()` for:

- Staleness checks (`entry.dataUpdatedAt + staleTime < clock.now()`)
- GC eligibility (`entry.dataUpdatedAt + cacheTime < clock.now()`)
- Timestamps on cache entries (`dataUpdatedAt`, `errorUpdatedAt`)
- Fetch history entries (`timestamp`, `durationMs`)

### Per-Scope Cache Isolation

Each `QueryClient` instance owns its own `QueryCache`. When a child client is
created via `queryClient.createChild(scope)`, the child gets a fresh, empty cache.
This provides complete isolation between scopes without key-qualification complexity.

#### Rules

1. **Root QueryClient has the root cache.** The cache stores results for queries
   resolved from the root container.
2. **Child QueryClients have independent caches.** `queryClient.createChild(scope)`
   creates a new client with its own cache instance. No data is shared between
   parent and child caches.
3. **Scope disposal disposes the child client.** When a scope is disposed, its
   associated child QueryClient is disposed: in-flight queries are cancelled and
   the child cache is cleared.
4. **Invalidation is scoped to the client.** `childClient.invalidate(UsersPort)`
   only affects entries in the child's cache, not the parent's.

```
Root Container ─── Root QueryClient ─── Root QueryCache
     │
     ├── Scope A ─── Child QueryClient A ─── Cache A
     │
     └── Scope B ─── Child QueryClient B ─── Cache B
```

#### Trade-Off

Per-scope caches sacrifice cross-scope cache sharing. If two scopes fetch the same
query with the same params, each scope fetches independently. This is the correct
trade-off for isolation-first architectures (multi-tenant, per-request). For scenarios
where cross-scope sharing is desired, use singleton adapters with the root client.

### GC Lifecycle

```
Entry created ──▶ observerCount: 1

Component mounts ──▶ observerCount: N (increments)

Component unmounts ──▶ observerCount: N-1 (decrements)

All unmounted ──▶ observerCount: 0
                   │
                   ▼
             GC timer starts
                   │
                   ├── cacheTime elapses ──▶ Entry removed
                   │
                   └── New observer mounts ──▶ Timer cancelled
                                                 Entry stays
```

### Default cacheTime

The default `cacheTime` is 300_000 ms (5 minutes). Ports can override:

```typescript
const TransientPort = createQueryPort<Status, void>()({
  name: "TransientData",
  defaults: { cacheTime: 0 }, // GC immediately when unused
});

const PermanentPort = createQueryPort<Config, void>()({
  name: "AppConfig",
  defaults: { cacheTime: Infinity }, // Never GC
});
```

## 31. Cache Persistence

Cache entries can be persisted to durable storage (localStorage, IndexedDB, AsyncStorage) for offline support and faster cold starts.

### Serialization

Cache entries serialize via `Result.toJSON()`, which produces a tagged JSON representation:

- `ok(value).toJSON()` yields `{ _tag: "Ok", value }`.
- `err(error).toJSON()` yields `{ _tag: "Err", error }`.

This tagged format ensures that on restore, the persister can reconstruct the correct
`Result` variant without ambiguity. When `result` is `undefined` (pending entry), the
serialized entry omits the `result` field entirely.

### Persister Port

```typescript
interface CachePersister {
  /** Save a single query to storage */
  persistQuery(key: CacheKey, entry: CacheEntry<unknown, unknown>): Promise<void>;

  /** Restore a single query from storage */
  restoreQuery(key: CacheKey): Promise<CacheEntry<unknown, unknown> | undefined>;

  /** Remove a single query from storage */
  removeQuery(key: CacheKey): Promise<void>;

  /** Restore all persisted queries */
  restoreAll(): Promise<ReadonlyArray<[CacheKey, CacheEntry<unknown, unknown>]>>;

  /** Clear all persisted queries */
  clear(): Promise<void>;
}

const CachePersisterPort = createPort<CachePersister>()({
  name: "CachePersister",
  direction: "outbound",
});
```

### Persistence Behavior

1. On QueryClient creation: restore all persisted entries into cache
2. On cache update: persist the updated entry (debounced)
3. On cache removal: remove the persisted entry
4. Stale persisted entries are refetched on restore (respecting staleTime)

### Buster Pattern

A `buster` string prevents stale persisted data from being restored after app updates:

```typescript
const LocalStoragePersisterAdapter = createAdapter({
  provides: CachePersisterPort,
  requires: [],
  lifetime: "singleton",
  factory: () =>
    createLocalStoragePersister({
      key: "hex-query-cache",
      buster: APP_VERSION, // Invalidates persisted cache on version change
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }),
});
```

---

_Previous: [06 - Mutation Adapters](./06-mutation-adapters.md)_

_Next: [08 - Query Lifecycle](./08-lifecycle.md)_
