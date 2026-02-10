# 02 - Core Concepts

## 5. QueryPort

A **QueryPort** declares what data is needed and its shape. It does not contain fetch logic. It is a real `DirectedPort<QueryFetcher<TData, TParams, TError>, TName, "inbound">`, meaning it participates in the HexDI dependency graph like any other port.

```typescript
const UsersPort = createQueryPort<User[], { role?: string }>()({
  name: "Users",
  defaults: { staleTime: 30_000 },
});
// Type: DirectedPort<QueryFetcher<User[], { role?: string }, Error>, "Users", "inbound">
```

The port carries:

- **Name** -- unique identifier and cache key prefix
- **Data type** -- compile-time shape of query results
- **Params type** -- compile-time shape of query parameters
- **Error type** -- compile-time shape of errors (default: `Error`)
- **DependsOn** -- compile-time data dependencies on other query ports (validated by GraphBuilder for cycles)
- **Defaults** -- staleTime, cacheTime, retry, refetch policies

## 6. MutationPort

A **MutationPort** declares what operation can be performed and its cache side effects. It is a real `DirectedPort<MutationExecutor<TData, TInput>, TName, "inbound">`.

```typescript
const CreateUserPort = createMutationPort<User, CreateUserInput>()({
  name: "CreateUser",
  effects: { invalidates: [UsersPort] },
});
```

The port carries:

- **Name** -- unique identifier
- **Data type** -- return type of the mutation
- **Input type** -- parameter type for the mutation
- **Error type** -- error shape (default: `Error`)
- **Context type** -- rollback context for optimistic updates
- **Effects** -- which query ports to invalidate/remove on success

## 7. QueryAdapter

A **QueryAdapter** implements how to fetch data for a QueryPort. It is a real HexDI `Adapter` and can declare dependencies on other ports.

```typescript
const RestUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort],
  factory:
    ({ httpClient }) =>
    (params, { signal }) =>
      ResultAsync.fromPromise(
        httpClient.get("/api/users", { params, signal }).then(r => r.data),
        error => new ApiError("Failed to fetch users", { cause: error })
      ),
});
```

Key properties:

- **Port binding** -- each adapter is bound to exactly one query port
- **DI dependencies** -- adapters declare `requires` just like any HexDI adapter
- **AbortSignal** -- every fetcher receives a cancellation signal
- **Pure factory** -- the factory receives resolved deps and returns a fetcher function that produces `ResultAsync<TData, TError>`

## 8. MutationAdapter

A **MutationAdapter** implements how to perform a mutation for a MutationPort. Same adapter pattern:

```typescript
const RestCreateUserAdapter = createMutationAdapter(CreateUserPort, {
  requires: [HttpClientPort],
  factory:
    ({ httpClient }) =>
    (input, { signal }) =>
      ResultAsync.fromPromise(
        httpClient.post("/api/users", input, { signal }).then(r => r.data),
        error => new ApiError("Failed to create user", { cause: error })
      ),
});
```

## 9. QueryClient

The **QueryClient** orchestrates caching, deduplication, retry, and query execution. It wraps a container -- it is **not** a port in the dependency graph:

```typescript
const container = createContainer(graph);
const queryClient = createQueryClient(container);

// Fetch with cache -- returns ResultAsync<TData, TError | QueryResolutionError>
const result = await queryClient.fetch(UsersPort, { role: "admin" });
result.match(
  users => console.log("Fetched", users.length, "users"),
  error => {
    if (error._tag === "QueryFetchFailed") {
      console.error("Fetch failed:", error.cause);
    }
  }
);

// Prefetch
await queryClient.prefetch(UserByIdPort, { id: "123" });

// Invalidate
await queryClient.invalidate(UsersPort);

// Direct cache access
const cached = queryClient.getQueryData(UsersPort, { role: "admin" });

// Scoped queries: create a child client with its own cache
const scope = container.createScope();
const scopedClient = queryClient.createChild(scope);
```

The QueryClient internally:

1. Generates a cache key from `[port.name, stableStringify(params)]`
2. Checks the cache for fresh data (reads the cache entry signal)
3. Checks the dedup map for in-flight requests
4. Resolves the query adapter from the bound container/scope
5. Executes the fetcher with retry logic
6. Stores results in the cache entry signal with structural sharing
7. Signal propagation automatically notifies all subscribers (computeds and effects)

> **Design note:** The QueryClient is not a port because it does not represent a service
> contract -- it is infrastructure that orchestrates resolution. Making it a port would
> introduce a service locator pattern where the QueryClient internally calls
> `container.resolve(port)` to obtain adapters, hiding dependencies from the graph.
> Instead, the QueryClient explicitly receives the container at construction time and
> each scope creates a child client with its own isolated cache.

## 10. QueryCache

The **QueryCache** stores query results and manages staleness. It is an internal data structure owned by the QueryClient. Each cache entry is backed by **signals** from `alien-signals/system`, enabling fine-grained reactivity.

```
Cache Key: [portName, paramsHash]
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│                   Reactive CacheEntry                         │
│                                                               │
│  result$: Signal<Result<TData, TError> | undefined>          │
│  fetchStatus$: Signal<FetchStatus>                           │
│  fetchCount$: Signal<number>                                 │
│  isInvalidated$: Signal<boolean>                             │
│  dataUpdatedAt$: Signal<number | undefined>                  │
│  errorUpdatedAt$: Signal<number | undefined>                 │
│                                                               │
│  status:    Computed  (derived from result$)                 │
│  data:      Computed  (derived from result$)                 │
│  error:     Computed  (derived from result$)                 │
│  isPending: Computed  (derived from status)                  │
│  isLoading: Computed  (derived from status + fetchStatus$)   │
│  isStale:   Computed  (derived from dataUpdatedAt$ + config) │
│                                                               │
│  Subscriber count is tracked automatically by                │
│  alien-signals' dependency graph (no manual counter).        │
└──────────────────────────────────────────────────────────────┘
```

Key behaviors:

- **Signal-based subscriber tracking** -- the reactive system automatically tracks which effects/computeds read from a cache entry signal; entries with zero subscribers are eligible for garbage collection after `cacheTime` expires
- **Structural sharing** -- when new data arrives, `replaceEqualDeep` compares against the previous value before writing to the signal, preserving reference equality for unchanged portions
- **Glitch-free propagation** -- alien-signals' topological sorting ensures derived computeds (`isPending`, `isLoading`, `isStale`) never expose intermediate/inconsistent state
- **Batched mutation effects** -- multiple cache invalidations from a single mutation are batched into one notification cycle via `batch()`
- **Serializable** -- entire cache can be serialized/deserialized for persistence or devtools

### Signal-Based Reactivity

Components do not subscribe to cache events manually. They read from **signals** and **computeds** via **effects** that the reactive system tracks automatically:

```
Component ──> createEffect() ──> Computed (isPending, data, etc.) ──> Signal (result$)

Signal-based reactivity:
  - Cache entries are signals; reading a signal registers a dependency
  - Derived state (isPending, isError, isFetching, etc.) are computeds
  - React hooks subscribe via useSyncExternalStore + createEffect
  - Structural sharing is applied at the signal write boundary
  - Refetch triggers (mount, focus, interval) write to fetchStatus$ signal
  - Staleness is a computed derived from dataUpdatedAt$ + staleTime config
  - Subscriber count is implicit in the dependency graph (no manual counter)
```

This eliminates the explicit QueryObserver/subscribe/notify plumbing used by TanStack Query. Instead, alien-signals' dependency graph provides automatic, fine-grained change propagation with diamond dependency resolution and glitch-free semantics.

### Per-Scope Reactive Isolation

Each QueryClient owns an isolated `ReactiveSystemInstance` created via `createIsolatedReactiveSystem()` from `alien-signals/system`. This means:

- **No cross-scope interference** -- signals in one scope cannot register as dependencies in another scope's computeds or effects
- **Isolated batching** -- `batch()` in scope A does not defer notifications in scope B
- **Deterministic disposal** -- disposing a scope tears down its reactive system, automatically unsubscribing all effects

---

_Previous: [01 - Overview & Philosophy](./01-overview.md)_

_Next: [03 - Query Ports](./03-query-ports.md)_
