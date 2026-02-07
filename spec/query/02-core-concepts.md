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
2. Checks the cache for fresh data
3. Checks the dedup map for in-flight requests
4. Resolves the query adapter from the bound container/scope
5. Executes the fetcher with retry logic
6. Stores results in the cache with structural sharing
7. Notifies all subscribers

> **Design note:** The QueryClient is not a port because it does not represent a service
> contract -- it is infrastructure that orchestrates resolution. Making it a port would
> introduce a service locator pattern where the QueryClient internally calls
> `container.resolve(port)` to obtain adapters, hiding dependencies from the graph.
> Instead, the QueryClient explicitly receives the container at construction time and
> each scope creates a child client with its own isolated cache.

## 10. QueryCache

The **QueryCache** stores query results and manages staleness. It is an internal data structure owned by the QueryClient.

```
Cache Key: [portName, paramsHash]
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│                        CacheEntry                             │
│                                                               │
│  result: Result<TData, TError>   status: QueryStatus         │
│  data: TData | undefined         dataUpdatedAt: number       │
│  error: TError | null            errorUpdatedAt: number      │
│  fetchCount: number              subscriberCount: number     │
│  isStale: boolean                                            │
│                                                               │
│  `result` is the source of truth. `data` and `error` are    │
│  derived accessors: data = result.isOk() ? result.value :    │
│  undefined; error = result.isErr() ? result.error : null.    │
└──────────────────────────────────────────────────────────────┘
```

Key behaviors:

- **Subscriber-based GC** -- entries with zero subscribers are eligible for garbage collection after `cacheTime` expires
- **Structural sharing** -- when new data arrives, only changed references are replaced (`replaceEqualDeep`)
- **Event-driven** -- cache mutations emit events that observers subscribe to
- **Serializable** -- entire cache can be serialized/deserialized for persistence or devtools

### Observer Pattern

Components do not read from the cache directly. They create **QueryObservers** that subscribe to cache changes and derive component-friendly state:

```
Component ──> QueryObserver ──> QueryCache ──> CacheEntry

QueryObserver:
  - Subscribes to a specific cache key
  - Derives isPending, isError, isFetching, etc.
  - Applies structural sharing to prevent unnecessary re-renders
  - Manages refetch triggers (mount, focus, interval)
  - Reports staleness based on port defaults + options
```

This is the same pattern used by TanStack Query (QueryObserver) and Apollo (ObservableQuery). The observer decouples cache management from UI framework bindings.

---

_Previous: [01 - Overview & Philosophy](./01-overview.md)_

_Next: [03 - Query Ports](./03-query-ports.md)_
