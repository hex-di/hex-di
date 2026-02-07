# 09 - Query Client

## 39. QueryClient Interface

```typescript
interface QueryClient {
  // === Query Operations ===

  /** Execute a query (respects cache, deduplication, retry) */
  fetch<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: FetchOptions
  ): ResultAsync<TData, TError | QueryResolutionError>;

  /** Prefetch a query (populate cache without returning) */
  prefetch<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: PrefetchOptions
  ): ResultAsync<void, TError | QueryResolutionError>;

  /** Ensure query data exists (fetch if missing or stale) */
  ensureQueryData<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: EnsureOptions
  ): ResultAsync<TData, TError | QueryResolutionError>;

  // === Mutation Operations ===

  /** Execute a mutation */
  mutate<TData, TInput, TError, TContext, TName extends string>(
    port: MutationPort<TName, TData, TInput, TError, TContext>,
    input: TInput,
    options?: MutateOptions<TData, TInput, TError, TContext>
  ): ResultAsync<TData, TError | QueryResolutionError>;

  // === Cache Read ===

  /** Get cached data (returns undefined if not in cache) */
  getQueryData<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): TData | undefined;

  /** Get query state (full state object) */
  getQueryState<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): QueryState<TData, TError> | undefined;

  // === Cache Write ===

  /** Set cached data directly */
  setQueryData<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    updater: TData | ((prev: TData | undefined) => TData)
  ): void;

  // === Invalidation ===

  /** Invalidate specific query or all queries for a port */
  invalidate<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): Promise<void>;

  /** Invalidate queries matching predicate */
  invalidateMatching(
    predicate: (entry: CacheEntry<unknown, unknown>, key: CacheKey) => boolean
  ): Promise<void>;

  /** Invalidate all queries */
  invalidateAll(): Promise<void>;

  // === Removal ===

  /** Remove queries from cache */
  remove<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;

  // === Cancellation ===

  /** Cancel in-flight queries */
  cancel<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): Promise<void>;

  /** Cancel all in-flight queries */
  cancelAll(): Promise<void>;

  // === Reset ===

  /** Reset query to initial state (removes data, cancels fetches) */
  reset<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;

  // === Subscriptions ===

  /** Subscribe to query state changes */
  subscribe<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    callback: (state: QueryState<TData, TError>) => void
  ): Unsubscribe;

  // === Inspection ===

  /** Get the underlying cache */
  getCache(): QueryCache;

  /** Count of currently fetching queries */
  isFetching(filters?: QueryFilters): number;

  /** Count of currently pending mutations */
  isMutating(filters?: MutationFilters): number;

  // === Scoping ===

  /** Create a child QueryClient bound to a scope, with its own cache */
  createChild(scope: Scope): QueryClient;

  // === Lifecycle ===

  /** Clear all queries, subscriptions, and timers */
  clear(): void;

  /** Pause all background operations (focus/interval refetch, GC) */
  pause(): void;

  /** Resume background operations */
  resume(): void;

  /** Dispose the QueryClient (cancel all, clear cache, stop GC) */
  dispose(): void;
}

interface QueryFilters {
  readonly port?: AnyQueryPort;
  readonly stale?: boolean;
  readonly fetching?: boolean;
  readonly predicate?: (entry: CacheEntry<unknown, unknown>, key: CacheKey) => boolean;
}

interface MutationFilters {
  readonly port?: AnyMutationPort;
  readonly status?: "idle" | "pending" | "success" | "error";
}
```

## 40. QueryClient Factory

The QueryClient wraps a container -- it is **not** a port in the dependency graph.
It is created alongside the container, not resolved from it.

```typescript
function createQueryClient(container: Container, config?: QueryClientConfig): QueryClient;

interface QueryClientConfig {
  /** Default options for all queries */
  readonly defaultOptions?: {
    readonly queries?: QueryDefaults;
    readonly mutations?: MutationDefaults;
  };

  /** Cache configuration */
  readonly cache?: {
    readonly maxSize?: number;
    readonly gcInterval?: number;
    readonly gcEnabled?: boolean;
  };

  /** Online manager (for pausing/resuming based on connectivity) */
  readonly onlineManager?: OnlineManager;

  /** Focus manager (for refetchOnWindowFocus) */
  readonly focusManager?: FocusManager;

  /** Cache persister for offline support */
  readonly persister?: CachePersister;

  /**
   * Maximum invalidation cascade depth before aborting.
   * Prevents unbounded invalidation loops from mutation effects.
   * Default: 10
   */
  readonly maxInvalidationDepth?: number;

  /**
   * Injectable time source for deterministic testing.
   * When not provided, defaults to Date.now().
   * See 07 - Cache Architecture for the Clock port pattern.
   */
  readonly clock?: { readonly now: () => number };
}

interface MutationDefaults {
  readonly retry?: number | boolean;
  readonly retryDelay?: number;
}
```

> **Design note:** The QueryClient accepts a `Container` (or `Scope`) at construction
> time, making the dependency on the container explicit. This avoids the service locator
> anti-pattern where a singleton QueryClient internally calls `container.resolve(port)`
> with no visible dependency declaration. The container reference is used only for
> resolving query/mutation adapters at fetch time.

## 41. Invalidation

Invalidation marks cached data as stale. Active queries (with observers) immediately refetch. Inactive queries refetch on their next mount.

### Invalidation Behaviors

| Scenario                             | Behavior                                |
| ------------------------------------ | --------------------------------------- |
| Query is active (has observers)      | Mark stale + trigger background refetch |
| Query is inactive (no observers)     | Mark stale only (refetch on next use)   |
| Query is currently fetching          | Cancel current fetch + restart          |
| Query is disabled (`enabled: false`) | Mark stale only (no auto-refetch)       |

### Automatic Invalidation

Mutations declare which queries to invalidate on success:

```typescript
const CreateUserPort = createMutationPort<User, CreateUserInput>()({
  name: "CreateUser",
  effects: {
    invalidates: [UsersPort], // All UsersPort queries become stale
  },
});

const DeleteUserPort = createMutationPort<void, { id: string }>()({
  name: "DeleteUser",
  effects: {
    invalidates: [UsersPort], // Refetch all user lists
    removes: [UserByIdPort], // Remove specific user from cache
  },
});
```

### Manual Invalidation

```typescript
// Invalidate all queries for a port
await queryClient.invalidate(UsersPort);

// Invalidate specific params
await queryClient.invalidate(UsersPort, { role: "admin" });

// Invalidate by predicate
await queryClient.invalidateMatching((_entry, key) => {
  return key[0] === "UserById";
});

// Nuclear option: invalidate everything
await queryClient.invalidateAll();
```

## 42. Cancellation

Queries can be cancelled via AbortController. The signal is propagated to the adapter's fetch function.

```typescript
// Cancel specific query
await queryClient.cancel(UsersPort, { role: "admin" });

// Cancel all queries for a port
await queryClient.cancel(UsersPort);

// Cancel all in-flight queries
await queryClient.cancelAll();
```

### When Cancellation Happens Automatically

1. Component unmounts (if no other observers remain)
2. Query is invalidated while fetching (cancel + restart)
3. Query parameters change (cancel old, start new)
4. `enabled` transitions from `true` to `false`

## 43. Prefetching

Prefetching populates the cache before data is needed. The result is stored in the cache but not returned.

```typescript
// Prefetch on hover
function UserLink({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  return (
    <Link
      to={`/users/${userId}`}
      onMouseEnter={() => {
        queryClient.prefetch(UserByIdPort, { id: userId });
      }}
    >
      View Profile
    </Link>
  );
}

// Prefetch in route loader
async function userPageLoader({ params }: LoaderArgs) {
  const queryClient = getQueryClient();
  const result = await queryClient.ensureQueryData(UserByIdPort, { id: params.userId });
  return result.match(
    (_data) => null,
    (error) => { throw new Response("Failed to load user", { status: 500 }); },
  );
}
```

### ensureQueryData vs prefetch

| Method            | Returns                   | Error Behavior          | Use Case                      |
| ----------------- | ------------------------- | ----------------------- | ----------------------------- |
| `prefetch`        | `ResultAsync<void, ...>`  | Captures error in `Err` | Fire-and-forget cache warming |
| `ensureQueryData` | `ResultAsync<TData, ...>` | Captures error in `Err` | Route loaders that need data  |

## 44. QueryClient as Container Extension

The QueryClient is **not** a port in the dependency graph. It wraps a container and is
created alongside it:

```typescript
const graph = GraphBuilder.create()
  .provide(HttpClientAdapter)
  .provide(RestUsersAdapter)
  .provide(RestProductsAdapter)
  .build();

const container = createContainer(graph);
const queryClient = createQueryClient(container, {
  defaultOptions: {
    queries: {
      staleTime: 0,
      cacheTime: 300_000,
      retry: 3,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  },
});
```

### Why Not a Port

| Concern               | Port approach (rejected)                                                         | Container extension (chosen)                    |
| --------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| Dependency visibility | QueryClient internally calls `container.resolve(port)` -- hidden service locator | Container reference is explicit at construction |
| Scope isolation       | Singleton cache shared across scopes -- data leakage risk                        | Each child client owns its own cache            |
| Graph pollution       | `QueryClientPort` + `QueryClientAdapter` + `QueryResolverPort` in graph          | Zero graph footprint                            |
| Disposal              | Complex 7-step finalizer registration                                            | Simple: cancel -> clear -> mark disposed        |

### Container Integration

```typescript
const container = createContainer(graph);
const queryClient = createQueryClient(container);

// Fetch resolves the adapter from the bound container and returns a Result
const result = await queryClient.fetch(UsersPort, { role: "admin" });

result.match(
  users => console.log(`Fetched ${users.length} users`),
  error => console.error("Fetch failed:", error)
);
```

Internally, `fetch` resolves the adapter from the bound container:

```typescript
// Inside QueryClient.fetch():
const fetcher = this.container.resolve(port);
// fetcher is the QueryFetcher function returned by the adapter's factory
const data = await fetcher(params, { signal });
```

### Scoped Queries

For scoped adapters (e.g., per-tenant, per-request), create a child QueryClient
bound to the scope:

```typescript
const scope = container.createScope();
const scopedClient = queryClient.createChild(scope);

// scopedClient resolves adapters from scope, has its own cache
const result = await scopedClient.fetch(UsersPort, {});

result.match(
  users => console.log("Scoped users:", users),
  error => console.error("Scoped fetch failed:", error)
);

// Disposing the scope disposes the child client
scope.dispose(); // cancels scopedClient's in-flight queries, clears its cache
```

## 44b. QueryResolutionError

Query resolution errors are modeled as a tagged union rather than a class hierarchy.
The `_tag` discriminant enables exhaustive `switch` handling without `instanceof`
checks, and composes naturally with `Result<TData, TError | QueryResolutionError>`.

```typescript
type QueryResolutionError =
  | {
      readonly _tag: "QueryFetchFailed";
      readonly portName: string;
      readonly params: unknown;
      readonly retryAttempt: number;
      readonly cause: unknown;
    }
  | {
      readonly _tag: "QueryCancelled";
      readonly portName: string;
      readonly params: unknown;
    }
  | {
      readonly _tag: "QueryTimeout";
      readonly portName: string;
      readonly params: unknown;
      readonly timeoutMs: number;
    }
  | {
      readonly _tag: "QueryAdapterMissing";
      readonly portName: string;
    }
  | {
      readonly _tag: "QueryInvalidationCycle";
      readonly chain: readonly string[];
      readonly depth: number;
    }
  | {
      readonly _tag: "QueryDisposed";
      readonly portName: string;
    };
```

The `_tag` field enables exhaustive pattern matching via `switch`. TypeScript narrows
the union member in each `case` branch, giving full access to variant-specific fields
without type guards or casts:

```typescript
function handleResolutionError(error: QueryResolutionError): string {
  switch (error._tag) {
    case "QueryFetchFailed":
      return `Fetch failed for ${error.portName} after ${error.retryAttempt} retries`;
    case "QueryCancelled":
      return `Query ${error.portName} was cancelled`;
    case "QueryTimeout":
      return `Query ${error.portName} timed out after ${error.timeoutMs}ms`;
    case "QueryAdapterMissing":
      return `No adapter registered for ${error.portName}. Did you forget .provide()?`;
    case "QueryInvalidationCycle":
      return `Invalidation cycle detected: ${error.chain.join(" -> ")} (depth: ${error.depth})`;
    case "QueryDisposed":
      return `QueryClient for ${error.portName} has been disposed`;
  }
}
```

### Error Handling Pattern

```typescript
const result = await queryClient.fetch(UsersPort, { role: "admin" });

result.match(
  users => {
    // Handle success -- users is typed as User[]
    renderUserList(users);
  },
  error => {
    // error is TError | QueryResolutionError
    // If TError is a tagged union too, switch on _tag for full coverage
    switch (error._tag) {
      case "QueryFetchFailed":
        console.error(`Fetch failed for ${error.portName}`, error.cause);
        break;
      case "QueryCancelled":
        console.log("Query was cancelled");
        break;
      case "QueryTimeout":
        console.error(`Query timed out after ${error.timeoutMs}ms`);
        break;
      case "QueryAdapterMissing":
        console.error(`No adapter for ${error.portName}. Did you forget .provide()?`);
        break;
      case "QueryInvalidationCycle":
        console.error(`Invalidation cycle: ${error.chain.join(" -> ")}`);
        break;
      case "QueryDisposed":
        console.error(`Client disposed, cannot fetch ${error.portName}`);
        break;
    }
  }
);
```

## 44c. Disposal

Since the QueryClient is not a port, disposal is explicit -- the caller is responsible
for calling `queryClient.dispose()` when done. For scoped child clients, disposal
happens automatically when the parent scope is disposed.

### Disposal Order

All QueryClient disposal (root or child) follows the same 4-step sequence:

```
queryClient.dispose()
  │
  ├── 1. Cancel all in-flight queries
  │      Signal all AbortControllers.
  │      Pending fetches settle with Err({ _tag: "QueryCancelled" }).
  │
  ├── 2. Stop background operations
  │      Stop GC timer, polling intervals, and refetch timers.
  │
  ├── 3. Clear the cache
  │      Remove all cache entries. Release memory.
  │      If a CachePersister is configured, flush pending writes first.
  │
  └── 4. Mark client as disposed
         All subsequent method calls return
         ResultAsync.err({ _tag: "QueryDisposed", portName }).
```

### Ordering Rationale

| Step                         | Why This Order                                                   |
| ---------------------------- | ---------------------------------------------------------------- |
| Cancel first                 | Prevents in-flight fetches from writing to cache during disposal |
| Stop background before clear | Prevents timers from firing after cache is gone                  |
| Clear after cancel           | Ensures no new data arrives after cleanup                        |
| Mark disposed last           | Ensures all cleanup completes before failing subsequent calls    |

### Disposal Safety

- **No adapter resolution during disposal.** Cancellation only signals existing
  AbortControllers, it does not resolve new adapters.
- **No observer callbacks during disposal.** Observers are detached before cache
  entries are removed, preventing re-fetch attempts during teardown.
- **No mutation effects during disposal.** Pending mutation effects are discarded.

### Use-After-Dispose Guarantees

After disposal, all QueryClient async methods return `ResultAsync.err({ _tag: "QueryDisposed", portName })`:

```typescript
const scope = container.createScope();
const scopedClient = queryClient.createChild(scope);
scope.dispose(); // also disposes scopedClient

// All of these return Err({ _tag: "QueryDisposed" }):
const fetchResult = await scopedClient.fetch(UsersPort, {});
fetchResult.isErr(); // true
fetchResult.error._tag; // "QueryDisposed"

const prefetchResult = await scopedClient.prefetch(UsersPort, {});
prefetchResult.isErr(); // true

const ensureResult = await scopedClient.ensureQueryData(UsersPort, {});
ensureResult.isErr(); // true
```

The `QueryDisposed` error includes the port name that was accessed, enabling
diagnostics to identify which component attempted post-disposal access.

### Child Client Lifecycle

Child clients are tied to their scope's lifecycle:

```typescript
const scope = container.createScope();
const scopedClient = queryClient.createChild(scope);

// Use the scoped client...
const result = await scopedClient.fetch(UsersPort, {});

result.match(
  users => console.log("Users:", users),
  error => console.error("Error:", error._tag)
);

// Option 1: Dispose the client directly
scopedClient.dispose();

// Option 2: Dispose the scope (disposes the client automatically)
scope.dispose();
```

The parent-child relationship is one-way: disposing the parent disposes all
children, but disposing a child does not affect the parent.

---

_Previous: [08 - Query Lifecycle](./08-lifecycle.md)_

_Next: [09b - Query Introspection](./09b-introspection.md)_
