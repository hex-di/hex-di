# 08 - Query Lifecycle

## 32. Lifecycle Diagram

```
  useQuery(UsersPort, { role: 'admin' })
                │
                ▼
  ┌─────────────────────────────┐
  │ 1. CREATE / GET OBSERVER    │
  │    QueryObserver binds to   │
  │    cache key + options      │
  └──────────────┬──────────────┘
                 │
                 ▼
  ┌─────────────────────────────┐
  │ 2. CHECK CACHE              │
  │    key: ['Users',           │
  │          '{"role":"admin"}']│
  └──────────────┬──────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
       ▼                   ▼
  ┌─────────┐         ┌─────────┐
  │ HIT     │         │ MISS    │
  │ + FRESH │         │ or STALE│
  └────┬────┘         └────┬────┘
       │                   │
       ▼                   ▼
  Return cached      ┌─────────────────────────────┐
  immediately        │ 3. CHECK DEDUP MAP          │
                     └──────────────┬──────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │                   │
                          ▼                   ▼
                     ┌─────────┐         ┌─────────┐
                     │IN-FLIGHT│         │ NONE    │
                     │ EXISTS  │         │         │
                     └────┬────┘         └────┬────┘
                          │                   │
                          ▼                   ▼
                     Subscribe to        ┌─────────────────────────────┐
                     in-flight fetch     │ 4. RESOLVE ADAPTER          │
                                         │    container.resolve(Port)  │
                                         └──────────────┬──────────────┘
                                                        │
                                                        ▼
                                         ┌─────────────────────────────┐
                                         │ 5. EXECUTE FETCH            │
                                         │    adapter(params, context) │
                                         └──────────────┬──────────────┘
                                                        │
                                           ┌────────────┴────────────┐
                                           │                         │
                                           ▼                         ▼
                                      ┌─────────┐               ┌─────────┐
                                      │ SUCCESS │               │ ERROR   │
                                      └────┬────┘               └────┬────┘
                                           │                         │
                                           ▼                         ▼
                                      * Structural share        * Retry?
                                      * Update cache            * Update error
                                      * Notify observers        * Notify observers
                                      * Clear from dedup        * Clear from dedup
                                      * Return data             * Return error
```

## 33. Query States

### Status Types

```typescript
type QueryStatus = "pending" | "success" | "error";
type FetchStatus = "idle" | "fetching";
```

### QueryState Interface

```typescript
interface QueryState<TData, TError = Error> {
  // === Status ===
  readonly status: QueryStatus;
  readonly fetchStatus: FetchStatus;

  // === Derived Booleans ===
  /** True when query has never successfully fetched */
  readonly isPending: boolean;
  /** True when last fetch was successful */
  readonly isSuccess: boolean;
  /** True when last fetch resulted in error */
  readonly isError: boolean;
  /** True when a fetch is currently in progress */
  readonly isFetching: boolean;
  /** True when refetching (has data AND fetching) */
  readonly isRefetching: boolean;
  /** True when first load (no data AND fetching) */
  readonly isLoading: boolean;
  /** True when data is stale */
  readonly isStale: boolean;
  /** True when showing placeholder data */
  readonly isPlaceholderData: boolean;

  // === Result ===

  /**
   * Source of truth for the last fetch outcome.
   * `undefined` when the query has never completed a fetch (pending state).
   * When defined, `data` and `error` are derived from this field.
   */
  readonly result: Result<TData, TError> | undefined;

  // === Derived Data ===

  /**
   * Derived: `result?.isOk() ? result.value : undefined`.
   * Convenience accessor for the success value.
   */
  readonly data: TData | undefined;

  /**
   * Derived: `result?.isErr() ? result.error : null`.
   * Convenience accessor for the error value.
   */
  readonly error: TError | null;

  // === Timestamps ===
  readonly dataUpdatedAt: number | undefined;
  readonly errorUpdatedAt: number | undefined;

  // === Actions ===
  readonly refetch: (options?: RefetchOptions) => ResultAsync<TData, TError | QueryResolutionError>;
}

interface RefetchOptions {
  readonly cancelRefetch?: boolean;
}
```

## 34. State Transitions

```
                         ┌─────────────────────────┐
                         │        INITIAL           │
                         │  status: 'pending'       │
                         │  fetchStatus: 'idle'     │
                         │  result: undefined       │
                         │  data: undefined         │
                         └──────────┬──────────────┘
                                    │
                                    │ mount / enabled
                                    ▼
                         ┌─────────────────────────┐
                         │       LOADING            │
                         │  status: 'pending'       │
                         │  fetchStatus: 'fetching' │
                         │  result: undefined       │
                         │  data: undefined         │
                         └──────────┬──────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
         ┌─────────────────────────┐  ┌─────────────────────────┐
         │       SUCCESS           │  │        ERROR             │
         │  status: 'success'      │  │  status: 'error'         │
         │  fetchStatus: 'idle'    │  │  fetchStatus: 'idle'     │
         │  result: ok(data)       │  │  result: err(error)      │
         │  data: TData            │  │  error: TError           │
         └──────────┬──────────────┘  └──────────┬──────────────┘
                    │                             │
                    │◀────────────────────────────┤
                    │         refetch()           │
                    ▼                             │
         ┌─────────────────────────┐              │
         │     REFETCHING          │              │
         │  status: 'success'      │──────────────┘
         │  fetchStatus: 'fetching'│   can fail
         │  result: ok(prevData)   │
         │  data: TData (prev)     │
         └─────────────────────────┘
```

### Transition Details

- **LOADING -> SUCCESS**: `result` is set to `ok(data)`. The `data` field is derived as `result.value`.
- **LOADING -> ERROR**: `result` is set to `err(error)`. The `error` field is derived as `result.error`.
- **REFETCHING -> SUCCESS**: A new `ok(newData)` result is produced. Structural sharing via `replaceEqualDeep` compares `newData` against `prevResult.value` (the previous `Ok`'s inner value). If the data is structurally equal, the previous value reference is preserved, preventing unnecessary re-renders.

### State Derivation Rules

```typescript
const isPending = status === "pending";
const isSuccess = status === "success";
const isError = status === "error";
const isFetching = fetchStatus === "fetching";
const isLoading = isPending && isFetching; // First load
const isRefetching = isSuccess && isFetching; // Background refetch
```

## 35. Staleness

Data is considered stale when it has exceeded its `staleTime`. Stale data is still returned from cache but triggers a background refetch.

```typescript
function isStale(entry: CacheEntry<unknown>, staleTime: number): boolean {
  if (entry.dataUpdatedAt === undefined) return true;
  if (entry.isInvalidated) return true;
  return Date.now() - entry.dataUpdatedAt > staleTime;
}
```

### staleTime Resolution Order

1. Per-hook option: `useQuery(Port, params, { staleTime: 60_000 })`
2. Per-port default: `createQueryPort(...)({ defaults: { staleTime: 30_000 } })`
3. QueryClient default: `createQueryClient({ defaultOptions: { queries: { staleTime: 0 } } })`
4. Global default: `0` (always stale, always refetch)

### staleTime Semantics

| staleTime     | Behavior                                                                        |
| ------------- | ------------------------------------------------------------------------------- |
| `0` (default) | Data is immediately stale. Every mount triggers a refetch.                      |
| `30_000`      | Data stays fresh for 30 seconds. Mounts within 30s use cache only.              |
| `Infinity`    | Data never goes stale automatically. Only manual invalidation triggers refetch. |

## 36. Refetch Triggers

| Trigger                   | Condition                                      | Behavior                                 |
| ------------------------- | ---------------------------------------------- | ---------------------------------------- |
| **Mount**                 | `refetchOnMount: true` AND data is stale       | Background refetch                       |
| **Mount (always)**        | `refetchOnMount: "always"`                     | Always refetch regardless of staleness   |
| **Window Focus**          | `refetchOnWindowFocus: true` AND data is stale | Background refetch                       |
| **Window Focus (always)** | `refetchOnWindowFocus: "always"`               | Always refetch on focus                  |
| **Interval**              | `refetchInterval: number`                      | Periodic refetch every N ms              |
| **Manual**                | `refetch()` called by user                     | Immediate refetch                        |
| **Invalidation**          | `queryClient.invalidate()` called              | Mark stale, refetch if active            |
| **Reconnect**             | `refetchOnReconnect: true` AND data is stale   | Background refetch when network restores |

### Online/Offline Behavior

Queries automatically pause when the browser goes offline and resume when connectivity is restored. The `refetchOnReconnect` option controls whether stale queries refetch on reconnect.

## 37. Deduplication

Deduplication prevents redundant network requests when multiple components request the same data simultaneously.

### DedupManager Interface

```typescript
interface DedupManager {
  /** Get existing in-flight result or create a new one */
  getOrCreate<T, E>(
    key: CacheKey,
    fetcher: (signal: AbortSignal) => ResultAsync<T, E>
  ): ResultAsync<T, E>;

  /** Cancel in-flight request */
  cancel(key: CacheKey): void;

  /** Cancel all in-flight requests */
  cancelAll(): void;

  /** Check if request is in-flight */
  isInFlight(key: CacheKey): boolean;

  /** Number of in-flight requests */
  readonly size: number;
}
```

### Behavior

```
Time ──────────────────────────────────────────────────▶

Component A:  useQuery(UsersPort, {}) ────┐
                                          │
Component B:  useQuery(UsersPort, {}) ────┼──▶ Single fetch() ──▶ Both get data
                                          │
Component C:  useQuery(UsersPort, {}) ────┘

Without deduplication: 3 network requests
With deduplication:    1 network request, 3 subscribers
```

### Cancellation on Unmount

When all observers for a key unmount before the fetch completes:

```typescript
// When observer count drops to 0 for an in-flight request:
// 1. Start a timeout (default: 0ms, configurable)
// 2. If no new observers mount within the timeout:
//    - Abort the fetch via AbortController
//    - Remove from dedup map
// 3. If a new observer mounts within the timeout:
//    - Cancel the timeout
//    - Subscribe the new observer to the in-flight fetch
```

## 38. Retry & Backoff

Failed queries are automatically retried with exponential backoff.

### Default Retry Configuration

| Option       | Default             | Description              |
| ------------ | ------------------- | ------------------------ |
| `retry`      | `3`                 | Number of retry attempts |
| `retryDelay` | Exponential backoff | Delay function           |

### Retry Delay Function

```typescript
function defaultRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30_000);
}

// attempt 0: 1000ms
// attempt 1: 2000ms
// attempt 2: 4000ms
// attempt 3: 8000ms (capped at 30s)
```

### Retry Flow

When a fetch fails, the QueryClient receives an `Err(error)` from the adapter. The
typed error is passed to the retry policy, enabling type-safe retry decisions based on
the error's `_tag` discriminant.

```typescript
const UsersPort = createQueryPort<User[], void, ApiError>()({
  name: "Users",
  defaults: {
    retry: (failureCount, error) => {
      switch (error._tag) {
        case "RateLimited":
          return true; // Always retry rate limits
        case "NotFound":
          return false; // Never retry 404s
        case "NetworkError":
          return failureCount < 5; // More retries for network issues
        default:
          return failureCount < 3;
      }
    },
    retryDelay: (attempt, error) => {
      // Rate-limited responses include a Retry-After hint
      if (error._tag === "RateLimited" && error.retryAfterMs !== undefined) {
        return error.retryAfterMs;
      }
      return Math.min(1000 * 2 ** attempt, 30_000);
    },
  },
});
```

### Retry Sequence

```
Fetch attempt 0 ──▶ Err(error)
    │
    ├── retry(0, error) → true
    ├── retryDelay(0, error) = 1000ms
    ▼
Fetch attempt 1 ──▶ Err(error)
    │
    ├── retry(1, error) → true
    ├── retryDelay(1, error) = 2000ms
    ▼
Fetch attempt 2 ──▶ Err(error)
    │
    ├── retry(2, error) → true
    ├── retryDelay(2, error) = 4000ms
    ▼
Fetch attempt 3 ──▶ Err(error)
    │
    ├── retry(3, error) → false
    └── Set error state: result = err(error)
```

---

_Previous: [07 - Cache Architecture](./07-cache.md)_

_Next: [09 - Query Client](./09-query-client.md)_
