# 15 - Appendices

## Appendix A: Comparison with Data Fetching Libraries

### Feature Matrix

| Feature                           | HexDI Query                   | TanStack Query v5              | SWR v2           | Apollo Client v3       |
| --------------------------------- | ----------------------------- | ------------------------------ | ---------------- | ---------------------- |
| **Query Key**                     | Port (typed object)           | String/tuple array             | String key       | GraphQL document       |
| **Fetch Function**                | Adapter (DI-resolved)         | Inline `queryFn`               | Inline `fetcher` | GraphQL executor       |
| **Dependency Injection**          | Native (ports/adapters)       | None                           | None             | None                   |
| **Compile-Time Graph Validation** | Yes (GraphBuilder)            | No                             | No               | No (codegen optional)  |
| **Structural Sharing**            | Yes (`replaceEqualDeep`)      | Yes                            | No               | Yes (normalized cache) |
| **Deduplication**                 | Yes                           | Yes                            | Yes              | Yes                    |
| **Background Refetch**            | Yes                           | Yes                            | Yes              | Yes (polling)          |
| **Retry**                         | Configurable                  | Configurable                   | Configurable     | Network retry link     |
| **Garbage Collection**            | Observer-based + cacheTime    | Observer-based + gcTime        | Timer-based      | Manual + `evict`       |
| **Optimistic Updates**            | `TContext` typed              | Untyped context                | Manual           | `optimisticResponse`   |
| **Infinite Queries**              | `useInfiniteQuery`            | `useInfiniteQuery`             | `useSWRInfinite` | `fetchMore`            |
| **Suspense**                      | `useSuspenseQuery`            | `useSuspenseQuery`             | `suspense: true` | `useSuspenseQuery`     |
| **Streaming**                     | `createStreamedQueryAdapter`  | `streamedQuery` (experimental) | No               | `useSubscription`      |
| **Mutations**                     | Port + adapter                | `useMutation`                  | `useSWRMutation` | `useMutation`          |
| **Auto Invalidation**             | Declared in port effects      | Manual `onSuccess`             | Manual `mutate`  | `refetchQueries`       |
| **Scope Isolation**               | Container scopes              | QueryClient instances          | SWRConfig        | ApolloProvider         |
| **Multi-Tenancy**                 | Graph per tenant              | Client per tenant              | Custom           | Link chain             |
| **Offline Support**               | CachePersisterPort            | `persistQueryClient`           | Custom           | `apollo-cache-persist` |
| **Devtools**                      | QueryInspectorPort + MCP      | React Query Devtools           | SWR DevTools     | Apollo DevTools        |
| **Introspection API**             | QueryInspectorAPI             | `QueryCache` events            | No               | `InMemoryCache` API    |
| **Tracing**                       | `@hex-di/tracing` spans       | No                             | No               | Apollo Tracing         |
| **MCP/AI Integration**            | Native (VISION.md Phase 3)    | No                             | No               | No                     |
| **Type-Level Tests**              | Comprehensive (`*.test-d.ts`) | No                             | No               | No                     |
| **Framework Agnostic**            | Core is framework-agnostic    | Yes                            | React-only       | React/Vue/Svelte       |
| **Bundle Size**                   | TBD                           | ~13KB gzipped                  | ~4KB gzipped     | ~33KB gzipped          |

### Key Differentiators

**vs TanStack Query:**

- Query keys are typed ports, not string arrays -- no key mismatches across components
- Fetch logic lives in adapters with DI, not inline `queryFn` -- testable without MSW/mocks
- Mutation cache effects declared at port level -- no scattered `onSuccess` callbacks
- Container scoping replaces QueryClient instances for isolation
- Introspection API reports to MCP for AI consumption

**vs SWR:**

- Strong typing throughout (ports, params, errors, context) vs string keys
- Mutation support is first-class with effects, not bolted on
- Structural sharing prevents unnecessary re-renders
- DI integration means adapters can depend on auth, logging, etc.

**vs Apollo Client:**

- Works with any data source (REST, GraphQL, gRPC, WebSocket) -- not GraphQL-specific
- No normalized cache complexity -- simpler mental model
- No codegen required -- ports provide type safety natively
- Lighter weight -- no GraphQL parser/executor overhead

## Appendix B: Glossary

| Term                        | Definition                                                                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Adapter**                 | HexDI implementation of a port. For queries, provides the fetch logic. For mutations, provides the execute logic.                                                                      |
| **Cache Entry**             | A single record in the QueryCache identified by a CacheKey. Contains data, error, status, and metadata.                                                                                |
| **Cache Key**               | Tuple `[portName, paramsHash]` uniquely identifying a cache entry.                                                                                                                     |
| **Cache Time**              | Duration (ms) an unused cache entry is kept before garbage collection. Default: 300,000 (5 min).                                                                                       |
| **Container**               | HexDI runtime that manages instance creation, scoping, disposal, and dependency resolution.                                                                                            |
| **Dehydrated State**        | A serializable snapshot of the QueryClient cache, produced by `dehydrate()` on the server and consumed by `hydrate()` on the client. Enables SSR cache transfer.                       |
| **Deduplication**           | Mechanism that ensures only one in-flight request exists for a given cache key. Subsequent requests share the same in-flight fetch.                                                    |
| **DirectedPort**            | A port with a direction (`"inbound"` or `"outbound"`). Query and mutation ports are always `"inbound"`.                                                                                |
| **Effects**                 | Cache side effects declared on a MutationPort: `invalidates` (mark stale) and `removes` (evict).                                                                                       |
| **Fetch Context**           | Object passed to every query fetcher: `{ signal, meta, client, pageParam, direction }`.                                                                                                |
| **Fetch Status**            | Whether a query is currently fetching: `"idle"`, `"fetching"`, or `"paused"`.                                                                                                          |
| **Garbage Collection (GC)** | Process that removes cache entries with zero observers after `cacheTime` expires.                                                                                                      |
| **Graph**                   | The dependency graph built by `GraphBuilder`. Contains all adapter registrations. Validated at compile time.                                                                           |
| **Hydration**               | The process of populating a client-side QueryClient cache from a `DehydratedState` object transferred from the server. Prevents redundant fetches after SSR.                           |
| **GraphBuilder**            | Compile-time validated builder for constructing dependency graphs. Reports missing adapters as TypeScript errors.                                                                      |
| **Invalidation**            | Marking cached data as stale. Active queries refetch immediately; inactive queries refetch on next mount.                                                                              |
| **Mutation Context**        | Object passed to mutation executors: `{ signal, meta }`.                                                                                                                               |
| **Mutation Executor**       | The function returned by a mutation adapter's factory: `(input, context) => ResultAsync<TData, TError>`.                                                                               |
| **Observer**                | A `QueryObserver` instance that subscribes to a cache entry and derives component-friendly state.                                                                                      |
| **Observer Count**          | Number of active observers (components) watching a cache entry. When zero, the entry becomes GC-eligible.                                                                              |
| **Optimistic Update**       | UI update applied before server confirmation. Uses `TContext` for type-safe rollback on error.                                                                                         |
| **Phantom Type**            | A type-only property (no runtime value) used for compile-time type extraction. Uses unique symbols.                                                                                    |
| **Placeholder Data**        | Data shown while the actual query is loading. Can be static or derived from previous data.                                                                                             |
| **Port**                    | HexDI contract declaring what a service provides. Query ports declare data contracts.                                                                                                  |
| **Prefetch**                | Populating the cache before data is needed. Does not return data.                                                                                                                      |
| **Query Fetcher**           | The function returned by a query adapter's factory: `(params, context) => ResultAsync<TData, TError>`.                                                                                 |
| **Query Inspector**         | Service providing runtime visibility into cache state, fetch history, and invalidation events.                                                                                         |
| **Query Status**            | The primary state of a query: `"pending"` (no data), `"success"`, or `"error"`.                                                                                                        |
| **QueryResolutionError**    | Tagged union of infrastructure errors produced by QueryClient: `QueryFetchFailed`, `QueryCancelled`, `QueryTimeout`, `QueryAdapterMissing`, `QueryInvalidationCycle`, `QueryDisposed`. |
| **Result**                  | Discriminated union `Ok<T, E> \| Err<T, E>` from `@hex-di/result`. Represents a value that is either a success (`Ok`) or a failure (`Err`).                                            |
| **ResultAsync**             | Async wrapper `Promise<Result<T, E>>` with chainable methods (`map`, `andThen`, `orElse`). Returned by query/mutation adapters and QueryClient methods.                                |
| **Scope**                   | A child container with isolated or overridden service instances. Used for per-request, per-tenant, or per-test isolation.                                                              |
| **Select**                  | A transform function applied to cached data before returning to the component. Runs on every cache update.                                                                             |
| **Stale Time**              | Duration (ms) before data is considered stale after fetching. Default: 0 (immediately stale).                                                                                          |
| **Streamed Query**          | A query that receives data incrementally via `AsyncIterable`. Used for SSE, WebSockets, AI completions.                                                                                |
| **Structural Sharing**      | Algorithm (`replaceEqualDeep`) that preserves reference equality for unchanged parts of a data tree.                                                                                   |
| **Tagged Union**            | A TypeScript union type where each member has a literal `_tag` property enabling exhaustive `switch` handling and type narrowing.                                                      |

## Appendix C: Design Decisions

### C1. Why ports instead of string keys?

**Decision:** Use typed port objects as query identifiers instead of string/tuple keys.

**Rationale:**

- String keys are stringly-typed -- no compile-time validation that key matches data shape
- Key duplication across components leads to drift and bugs
- Ports are already the HexDI primitive for service contracts
- Ports carry type information (data, params, error) that flows through the entire system
- Ports enable compile-time graph validation via GraphBuilder

**Trade-off:** Slightly more boilerplate per query definition. Offset by zero runtime key management and full type safety.

### C2. Why adapters instead of inline queryFn?

**Decision:** Fetch logic lives in adapters, not in hooks or components.

**Rationale:**

- Inline `queryFn` couples components to data fetching implementation details (URLs, HTTP methods, response parsing)
- Adapters participate in the HexDI dependency graph -- they can depend on `HttpClientPort`, `AuthPort`, `LoggerPort`
- Adapter swapping enables testing without MSW or network mocking
- Different environments (production, staging, test) swap adapters, not fetch functions

**Trade-off:** More indirection for simple cases. For a prototype with one fetch call, inline `queryFn` is simpler. But for any non-trivial app, the separation pays for itself.

### C3. Why declared mutation effects?

**Decision:** Cache side effects (invalidation, removal) are declared on the MutationPort, not in mutation callbacks.

**Rationale:**

- Effects on the port are statically analyzable -- the invalidation graph can be derived without executing code
- Eliminates scattered `onSuccess: () => queryClient.invalidateQueries(...)` calls
- Effects are inspectable via `QueryInspectorPort.getInvalidationGraph()`
- AI tools (MCP) can answer "what happens when CreateUser succeeds?" from port metadata alone

**Trade-off:** Less flexibility for conditional invalidation. If a mutation should only sometimes invalidate, use manual invalidation in `onSuccess` instead.

### C4. Why observer pattern?

**Decision:** Components interact with cache through `QueryObserver` instances, not direct cache access.

**Rationale:**

- Decouples cache management from UI framework bindings
- Observers derive component-friendly state (`isPending`, `isError`, etc.)
- Observers manage refetch triggers (mount, focus, interval)
- Same pattern used by TanStack Query and Apollo Client -- proven at scale
- Enables future framework adapters (Vue, Svelte) without changing core

### C5. Why structural sharing?

**Decision:** Use `replaceEqualDeep` to preserve reference equality for unchanged data.

**Rationale:**

- React re-renders when references change, even if values are identical
- Without structural sharing, every refetch creates new objects and triggers re-renders
- With structural sharing, only the changed parts of the data tree get new references
- Critical for performance in apps that refetch frequently (polling, window focus)

**Trade-off:** Small CPU cost per refetch to compare old and new data trees. Negligible for typical payload sizes.

### C6. Why CachePersisterPort instead of built-in persistence?

**Decision:** Cache persistence is a port/adapter, not a built-in feature.

**Rationale:**

- Different apps need different storage backends (localStorage, IndexedDB, AsyncStorage, file system)
- Persistence is an infrastructure concern -- belongs in the adapter layer
- The `buster` pattern handles schema migration between app versions
- Not every app needs persistence -- no bundle cost if unused

### C7. Why QueryInspectorPort?

**Decision:** Provide a dedicated port for query introspection that reports to the HexDI inspector system.

**Rationale:**

- VISION.md Phase 3: every library reports what it knows to the central nervous system
- Enables MCP resource mapping for AI consumption
- Tracing integration provides end-to-end traces through the data fetching layer
- Devtools can subscribe to events without coupling to internals

### C8. Why no onSuccess/onError/onSettled on queries?

**Decision:** `UseQueryOptions` omits `onSuccess`, `onError`, and `onSettled` callbacks. `UseMutationOptions` keeps them.

**Rationale:**

1. **Per-render firing footgun.** Query callbacks fire on every render that observes a
   state transition, not once per fetch. If two components observe the same query and
   it transitions to `"success"`, `onSuccess` fires twice -- once per observer.
   Developers expect fire-once semantics, but queries are declarative subscriptions.

2. **Stale closures.** Callbacks capture the closure from the render that created them.
   If the callback references component state, it may read stale values on subsequent
   firings. This leads to subtle bugs that are hard to reproduce and debug.

3. **TanStack Query v5 precedent.** TanStack Query v5 removed these callbacks for the
   same reasons (see [tkdodo.eu/blog/breaking-react-querys-api-on-purpose](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose)).
   The community migration proved that `useEffect` and global callbacks cover all use cases.

4. **Mutations are different.** Mutation callbacks fire once per `mutate()` call --
   imperative, fire-once semantics. There is no stale closure issue because the callback
   is bound at call time, not at subscription time. This is why `UseMutationOptions`
   retains `onSuccess`, `onError`, and `onSettled`.

**Migration path:**

- **Side effects (analytics, toasts):** Use `useEffect` watching `data` or `error`:
  ```typescript
  const { data } = useQuery(UsersPort, {});
  useEffect(() => {
    if (data) analytics.track("loaded");
  }, [data]);
  ```
- **Error boundaries:** Use `throwOnError: true` to propagate errors to the nearest
  `<ErrorBoundary>`.
- **Global handlers:** Configure `onError` at the `QueryClient` level for cross-cutting
  error handling (e.g., 401 redirect to login).

### C9. Why QuerySuggestion follows GraphSuggestion's shape

**Decision:** `QuerySuggestion` uses the same `{ type, portName, message, action }`
shape as `GraphSuggestion` from `@hex-di/graph`.

**Rationale:**

1. **Ecosystem consistency.** Every HexDI package that produces actionable suggestions
   uses the same four-field interface. This means tooling (devtools, CLI diagnostics,
   MCP resources) can process suggestions from `@hex-di/graph`, `@hex-di/query`, and
   future packages with the same handler.

2. **MCP consumption.** AI tools consuming `hexdi://query/suggestions` and
   `hexdi://graph/suggestions` receive identically shaped data. The AI can correlate
   graph-level issues (orphan ports, depth warnings) with query-level issues
   (invalidation storms, high error rates) without schema translation.

3. **AI correlation.** When an AI agent sees a `missing_adapter` suggestion from both
   the graph inspector and the query inspector, it knows these describe the same
   underlying issue from two perspectives. Shared `type` discriminants enable this
   cross-domain reasoning.

**Trade-off:** `QuerySuggestion.type` has different values than `GraphSuggestion.type`
(query-specific categories vs graph-specific categories). They share the structural
shape, not the type union. This is intentional -- the shape is the contract, the type
values are domain-specific.

### C10. Why no cache normalization, and the paramsHash algorithm choice

**Decision:** HexDI Query uses a document-style cache keyed by `[portName, paramsHash]`
with no entity normalization. The `paramsHash` is the raw deterministic JSON string,
not a hash digest.

**Rationale (no normalization):**

1. **Simplicity.** Normalized caches require identity extraction (`__typename + id`),
   merge policies, field policies, and garbage collection strategies for dangling
   references. This complexity is justified for GraphQL (where the schema defines
   entity identity), but not for REST/RPC where responses are arbitrary JSON shapes.

2. **Predictability.** Updating one cache entry never silently modifies another. This
   eliminates an entire class of bugs where a mutation response merges incorrectly
   into the normalized store and corrupts unrelated queries.

3. **Consistency model.** Mutation effects (`invalidates`, `removes`) provide explicit,
   declarative, inspectable cross-query consistency. The AI (via MCP) can reason about
   what a mutation affects by reading port metadata, without understanding normalization
   rules.

4. **Trade-off acknowledgment.** Duplicate data exists across entries. A user entity
   may appear in `UsersPort({})`, `UserByIdPort({ id: "1" })`, and
   `SearchPort({ query: "alice" })`. The duplication cost (memory) is negligible for
   typical payloads. The consistency cost (stale duplicates) is handled by mutation
   effects invalidating all affected ports.

**Rationale (paramsHash as raw JSON string):**

1. **Debuggability.** Cache keys like `["Users", '{"page":1,"role":"admin"}']` are
   immediately readable in logs, devtools, error messages, and MCP resource dumps.
   A SHA-256 hash like `["Users", "a3f2b..."]` requires a lookup table to decode.

2. **Consistency with HexDI.** The `inspectionToJSON()` pattern in `@hex-di/graph`
   serializes inspection data for human consumption. The paramsHash follows the same
   principle: structured data readable by humans and AI alike.

3. **Future escape hatch.** For extremely large params (> 1KB serialized), a future
   opt-in `hashLargeParams: true` option can apply SHA-256. This is not included in
   v0.1.0 because the common case (small param objects) benefits more from readability
   than compactness.

### C11. Why Result instead of throw/catch?

**Decision:** Adapters return `ResultAsync<TData, TError>` and QueryClient propagates `ResultAsync<TData, TError | QueryResolutionError>`. Error classes are replaced by a `QueryResolutionError` tagged union.

**Rationale:**

1. **Phantom type gap.** In the original design, `TError` on `QueryPort` was phantom -- it existed at the type level but was absent from the `QueryFetcher` return type (`Promise<TData>`). Adapters could throw anything regardless of what `TError` declared. Result makes the error channel structural: `TError` appears in the fetcher signature (`ResultAsync<TData, TError>`), so the type system enforces what errors an adapter actually produces.

2. **Exhaustive handling.** `QueryResolutionError._tag` enables `switch` exhaustiveness checking. Consumers handle `"QueryFetchFailed"`, `"QueryCancelled"`, `"QueryTimeout"`, etc. explicitly. TypeScript warns if a case is missing.

3. **Error accumulation.** `safeTry` and `ResultAsync.collect` compose multiple query results with typed error unions. `Promise.all` loses error type information; `collect` preserves it as `E1 | E2 | E3`.

4. **Tracing integration.** `Result._tag` maps directly to span attributes. The tracing system records `query.result: "ok" | "err"` and `query.error_tag: "NotFound"` without needing to catch and inspect exceptions.

5. **No control flow disruption.** Thrown errors unwind the call stack and can be accidentally swallowed by intermediate `catch` blocks. `Result` values flow through normal return paths and must be explicitly handled.

**Trade-off:** Adapters wrapping throwing libraries (e.g., `axios`) must use `ResultAsync.fromPromise(promise, errorMapper)`. This adds a one-line wrapper per adapter but forces explicit error classification at the boundary.

## Appendix D: Migration from TanStack Query

### Query Definition

```typescript
// TanStack Query v5
const { data } = useQuery({
  queryKey: ["users", { role: "admin" }],
  queryFn: ({ signal }) => fetch("/api/users?role=admin", { signal }).then(r => r.json()),
  staleTime: 30_000,
});

// HexDI Query
// 1. Define port (once)
const UsersPort = createQueryPort<User[], { role?: string }>()({
  name: "Users",
  defaults: { staleTime: 30_000 },
});

// 2. Define adapter (once)
const RestUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: http }) =>
    (params, { signal }) =>
      ResultAsync.fromPromise(
        http.get("/api/users", { params, signal }).then(r => r.data),
        error => classifyHttpError(error)
      ),
});

// 3. Use in component
const { data } = useQuery(UsersPort, { role: "admin" });
```

### Mutation Definition

```typescript
// TanStack Query v5
const { mutate } = useMutation({
  mutationFn: (input: CreateUserInput) =>
    fetch("/api/users", { method: "POST", body: JSON.stringify(input) }).then(r => r.json()),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  },
});

// HexDI Query
// 1. Define port with effects
const CreateUserPort = createMutationPort<User, CreateUserInput>()({
  name: "CreateUser",
  effects: { invalidates: [UsersPort] },
});

// 2. Define adapter
const RestCreateUserAdapter = createMutationAdapter(CreateUserPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: http }) =>
    (input, { signal }) =>
      ResultAsync.fromPromise(
        http.post("/api/users", input, { signal }).then(r => r.data),
        error => classifyHttpError(error)
      ),
});

// 3. Use in component (invalidation happens automatically)
const { mutate } = useMutation(CreateUserPort);
```

### Invalidation

```typescript
// TanStack Query v5
queryClient.invalidateQueries({ queryKey: ["users"] });
queryClient.invalidateQueries({ queryKey: ["users", { role: "admin" }] });

// HexDI Query
queryClient.invalidate(UsersPort);
queryClient.invalidate(UsersPort, { role: "admin" });
```

### Prefetching

```typescript
// TanStack Query v5
await queryClient.prefetchQuery({
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId),
});

// HexDI Query
await queryClient.prefetch(UserByIdPort, { id: userId });
```

### Optimistic Updates

```typescript
// TanStack Query v5
const { mutate } = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ["todos"] });
    const previous = queryClient.getQueryData(["todos"]);
    queryClient.setQueryData(["todos"], (old) => /* update */);
    return { previous }; // untyped context
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(["todos"], context.previous); // context is any
  },
});

// HexDI Query
const UpdateTodoPort = createMutationPort<
  Todo,
  UpdateTodoInput,
  Error,
  { previousTodos: readonly Todo[] } // typed context
>()({
  name: "UpdateTodo",
  effects: { invalidates: [TodosPort] },
});

const { mutate } = useMutation(UpdateTodoPort, {
  onMutate: async (input) => {
    await queryClient.cancel(TodosPort);
    const previous = queryClient.getQueryData(TodosPort, {});
    queryClient.setQueryData(TodosPort, {}, (old) => /* update */);
    return { previousTodos: previous ?? [] }; // type-checked
  },
  onError: (_err, _input, context) => {
    if (context?.previousTodos) {
      queryClient.setQueryData(TodosPort, {}, context.previousTodos); // typed
    }
  },
});
```

### Concept Mapping Table

| TanStack Query                    | HexDI Query                                      | Notes                             |
| --------------------------------- | ------------------------------------------------ | --------------------------------- |
| `queryKey`                        | `QueryPort`                                      | Port IS the key                   |
| `queryFn`                         | `createQueryAdapter`                             | Fetch logic in adapter            |
| `mutationFn`                      | `createMutationAdapter`                          | Mutation logic in adapter         |
| `QueryClient`                     | `createQueryClient(container)` (wraps container) | Same concept, container extension |
| `QueryClientProvider`             | `QueryClientProvider` (accepts client directly)  | No container resolution           |
| `invalidateQueries({ queryKey })` | `invalidate(port, params?)`                      | Port-based, typed                 |
| `setQueryData(key, updater)`      | `setQueryData(port, params, updater)`            | Port-based, typed                 |
| `gcTime`                          | `cacheTime`                                      | Same concept                      |
| `placeholderData`                 | `placeholderData`                                | Same API                          |
| `select`                          | `select`                                         | Same API                          |
| `enabled`                         | `enabled`                                        | Same API                          |
| `Promise<T>` (throws)             | `ResultAsync<T, E>`                              | Structural error channel          |
| `try/catch`                       | `result.match()` / `switch(error._tag)`          | Exhaustive error handling         |
| Devtools (React component)        | `QueryInspectorPort` + MCP                       | AI-consumable                     |

---

_Previous: [14 - API Reference](./14-api-reference.md)_

_End of specification_
