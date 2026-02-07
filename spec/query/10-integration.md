# 10 - HexDI Integration

## 45. Graph Composition

Query adapters are standard HexDI adapters. They compose in the graph alongside infrastructure adapters:

```typescript
// Production graph -- only adapters, no query infrastructure
const ProductionGraph = GraphBuilder.create()
  // Infrastructure
  .provide(
    createAdapter({
      provides: HttpClientPort,
      requires: [],
      lifetime: "singleton",
      factory: () =>
        axios.create({
          baseURL: process.env.API_URL,
          timeout: 10000,
        }),
    })
  )
  .provide(AuthInterceptorAdapter)
  .provide(LoggerAdapter)

  // Query adapters (these ARE regular adapters in the graph)
  .provide(RestUsersAdapter)
  .provide(RestProductsAdapter)
  .provide(RestOrdersAdapter)

  // Mutation adapters
  .provide(RestCreateUserAdapter)
  .provide(RestUpdateUserAdapter)
  .provide(RestDeleteUserAdapter)

  .build();

// QueryClient wraps the container -- created alongside it, not inside it
const container = createContainer(ProductionGraph);
const queryClient = createQueryClient(container, {
  defaultOptions: {
    queries: { staleTime: 0, cacheTime: 300_000, retry: 3 },
  },
});
```

### Test Graph

```typescript
const TestGraph = GraphBuilder.create()
  .provide(MockHttpClientAdapter)
  .provide(NoopLoggerAdapter)
  .provide(MockUsersAdapter)
  .provide(MockProductsAdapter)
  .build();

const testContainer = createContainer(TestGraph);
const testQueryClient = createQueryClient(testContainer);
```

### Graph Validation

At compile time, the GraphBuilder validates that all query adapter dependencies are satisfied. If a `RestUsersAdapter` requires `HttpClientPort` and no adapter provides it, TypeScript reports a compile-time error:

```typescript
// Compile error: Missing adapter for port "HttpClient"
const graph = GraphBuilder.create()
  .provide(RestUsersAdapter) // requires HttpClientPort!
  .build();
```

## 46. Resolution Flow

When `useQuery(UsersPort, params)` is called:

```typescript
// 1. React hook gets the QueryClient from context
const queryClient = useQueryClient();

// 2. QueryClient checks cache for [UsersPort.name, hash(params)]
const cached = queryClient.getCache().get(UsersPort, params);

// 3. If cache miss or stale, QueryClient resolves the adapter from its bound container
//    using resolveResult to get a Result<QueryFetcher, QueryResolutionError>
const adapterResult = queryClient.container.resolveResult(UsersPort);
// adapterResult is Result<QueryFetcher, QueryResolutionError>

// 4. Handle resolution outcome
const data = adapterResult.match(
  fetcher => fetcher(params, { signal }),
  error => {
    // Resolution failure becomes a QueryResolutionError tagged union member
    return ResultAsync.err({
      _tag: "QueryAdapterMissing",
      portName: port.name,
    } satisfies QueryResolutionError);
  }
);

// 5. Result stored in cache, observers notified
```

### Container Scope Awareness

When query adapters have scoped dependencies, create a child QueryClient bound to the scope:

```typescript
// AuthTokenPort is scoped (different per request/session)
const SecureUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort, AuthTokenPort],
  factory:
    ({ HttpClient: httpClient, AuthToken: authToken }) =>
    (params, { signal }) =>
      ResultAsync.fromPromise(
        httpClient
          .get("/api/users", {
            params,
            signal,
            headers: { Authorization: `Bearer ${authToken}` },
          })
          .then(r => r.data),
        error => classifyHttpError(error)
      ),
});

// Each scope gets its own child client with its own cache
const scope = container.createScope();
const scopedClient = queryClient.createChild(scope);
const users = await scopedClient.fetch(UsersPort, {});
// Uses this scope's AuthToken, stores result in scope's cache
```

## 47. Scoped Queries

HexDI's scope system enables isolated query contexts:

### Per-Request Scoping (Server)

```typescript
app.use(async (ctx, next) => {
  const scope = container.createScope();
  const scopedClient = queryClient.createChild(scope);

  // Scope-specific configuration
  scope.provide(AuthTokenPort, ctx.headers.authorization);

  // All queries in this request use this scope's auth and cache
  const users = await scopedClient.fetch(UsersPort, {});

  // Scope disposal cancels pending queries, clears scoped cache
  scope.dispose();
});
```

### Per-Tenant Scoping (Multi-Tenant)

```typescript
function TenantProvider({ tenantId, children }: Props) {
  const parentContainer = useContainer();
  const parentQueryClient = useQueryClient();

  const { scope, scopedClient } = useMemo(() => {
    const s = parentContainer.createScope();
    // Override HttpClient baseURL for this tenant
    s.provide(HttpClientPort, axios.create({
      baseURL: `https://${tenantId}.api.example.com`,
    }));
    return { scope: s, scopedClient: parentQueryClient.createChild(s) };
  }, [tenantId, parentContainer, parentQueryClient]);

  useEffect(() => () => scope.dispose(), [scope]);

  return (
    <ContainerProvider container={scope}>
      <QueryClientProvider client={scopedClient}>
        {children}
      </QueryClientProvider>
    </ContainerProvider>
  );
}
```

### Per-Form Scoping

```typescript
function EditUserForm({ userId }: Props) {
  const parentContainer = useContainer();
  const parentQueryClient = useQueryClient();

  const { scope, scopedClient } = useMemo(() => {
    const s = parentContainer.createScope();
    return { scope: s, scopedClient: parentQueryClient.createChild(s) };
  }, [parentContainer, parentQueryClient]);

  useEffect(() => () => scope.dispose(), [scope]);

  return (
    <ContainerProvider container={scope}>
      <QueryClientProvider client={scopedClient}>
        <UserFormContent userId={userId} />
      </QueryClientProvider>
    </ContainerProvider>
  );
}
```

## 48. Multi-Tenant Configuration

Different adapters per tenant via graph composition:

```typescript
function createTenantGraph(tenantId: string) {
  const baseUrl = `https://${tenantId}.api.example.com`;

  return GraphBuilder.create()
    .provide(createAdapter({
      provides: HttpClientPort,
      requires: [],
      lifetime: "singleton",
      factory: () => axios.create({ baseURL: baseUrl }),
    }))
    .provide(RestUsersAdapter)
    .provide(RestProductsAdapter)
    .build();
}

// Root app switches graphs based on tenant
function App() {
  const tenantId = useTenantId();

  const { container, queryClient } = useMemo(() => {
    const graph = createTenantGraph(tenantId);
    const c = createContainer(graph);
    return { container: c, queryClient: createQueryClient(c) };
  }, [tenantId]);

  return (
    <ContainerProvider container={container}>
      <QueryClientProvider client={queryClient}>
        <TenantApp />
      </QueryClientProvider>
    </ContainerProvider>
  );
}
```

Each tenant gets:

- Its own `HttpClient` configured with the tenant's API URL
- Its own `QueryClient` with an isolated cache
- Shared query/mutation adapter logic (different backend, same code)

## 48b. Compile-Time Query Dependency Validation

When query ports declare `dependsOn`, the GraphBuilder integrates these declarations
into the existing type-level dependency graph. This reuses the same `IsReachable<>`
infrastructure used for adapter cycle detection -- no new type machinery is needed.

### How It Works

The GraphBuilder's `BuilderInternals.TDepGraph` already tracks edges of the form
`{ [PortName]: RequiredPortNames }`. When a query adapter is registered via
`.provide()`, the GraphBuilder:

1. **Extracts adapter edges** (existing): `RestUsersAdapter` provides `"Users"`,
   requires `"HttpClient"` -> edge `{ Users: "HttpClient" }`.
2. **Extracts dependsOn edges** (new): `UsersPort` has `dependsOn: [UserByIdPort]`
   -> edge `{ Users: "UserById" }` in a **separate query dependency map**.
3. **Runs cycle detection** on the query dependency map using `IsReachable<>`.
4. **Produces compile-time errors** using template literal error types.

### Two Dependency Maps

The GraphBuilder maintains two dependency maps in `BuilderInternals`:

| Map              | Tracks                             | Used For                              |
| ---------------- | ---------------------------------- | ------------------------------------- |
| `TDepGraph`      | Adapter port->port dependencies    | Circular adapter dependency detection |
| `TQueryDepGraph` | Query port->port data dependencies | Circular query dependency detection   |

These maps are independent. An adapter cycle (`A requires B, B requires A`) is
different from a query cycle (`Query A dependsOn Query B, Query B dependsOn Query A`).
Both are detected, but via separate graph traversals.

### BuilderInternals Extension

`TQueryDepGraph` is stored as an additional type parameter in `BuilderInternals`,
following the established Get\*/With\* lens pattern:

```typescript
// BuilderInternals gains a new type parameter (8th position):
interface BuilderInternals<
  out TDepGraph = EmptyDependencyGraph,
  out TLifetimeMap = EmptyLifetimeMap,
  out TParentProvides = unknown,
  out TMaxDepth extends number = DefaultMaxDepth,
  out TUnsafeDepthOverride extends boolean = false,
  out TDepthExceededWarning extends string = never,
  out TUncheckedUsed extends boolean = false,
  out TQueryDepGraph = EmptyDependencyGraph, // NEW: query data dependency map
> {
  readonly depGraph: TDepGraph;
  readonly lifetimeMap: TLifetimeMap;
  readonly parentProvides: TParentProvides;
  readonly maxDepth: TMaxDepth;
  readonly unsafeDepthOverride: TUnsafeDepthOverride;
  readonly depthExceededWarning: TDepthExceededWarning;
  readonly uncheckedUsed: TUncheckedUsed;
  readonly queryDepGraph: TQueryDepGraph; // NEW
}
```

Corresponding Get\*/With\* utilities follow the existing lens convention:

```typescript
/** Extract the query dependency graph from BuilderInternals */
type GetQueryDepGraph<T extends AnyBuilderInternals> = T["queryDepGraph"];

/** Create new BuilderInternals with an updated query dependency graph */
type WithQueryDepGraph<T extends AnyBuilderInternals, TNewQueryDepGraph> = BuilderInternals<
  T["depGraph"],
  T["lifetimeMap"],
  T["parentProvides"],
  T["maxDepth"],
  T["unsafeDepthOverride"],
  T["depthExceededWarning"],
  T["uncheckedUsed"],
  TNewQueryDepGraph
>;

/** Create new BuilderInternals with updated adapter AND query dependency graphs */
type WithBothDepGraphs<
  T extends AnyBuilderInternals,
  TNewDepGraph,
  TNewQueryDepGraph,
> = BuilderInternals<
  TNewDepGraph,
  T["lifetimeMap"],
  T["parentProvides"],
  T["maxDepth"],
  T["unsafeDepthOverride"],
  T["depthExceededWarning"],
  T["uncheckedUsed"],
  TNewQueryDepGraph
>;
```

When `.provide()` registers a query adapter whose port has `dependsOn`, the
GraphBuilder updates **both** maps in a single step:

```typescript
// Type-level flow inside GraphBuilder.provide():
//
// 1. Extract adapter edges -> AddEdge<TDepGraph, "Users", "HttpClient">
// 2. Extract dependsOn edges -> AddEdge<TQueryDepGraph, "UserPosts", "UserById">
// 3. Validate adapter cycles -> IsReachable<NewDepGraph, ...>
// 4. Validate query cycles -> IsReachable<NewQueryDepGraph, ...>
// 5. Return WithBothDepGraphs<TInternals, NewDepGraph, NewQueryDepGraph>
```

The `DefaultInternals` type initializes both maps to `EmptyDependencyGraph`:

```typescript
type DefaultInternals = BuilderInternals<
  EmptyDependencyGraph, // adapter deps
  EmptyLifetimeMap,
  unknown,
  DefaultMaxDepth,
  false,
  never,
  false,
  EmptyDependencyGraph // query deps (NEW)
>;
```

`UnifiedMergeInternals` merges query dependency graphs from both sides:

```typescript
type UnifiedMergeInternals<T1, T2, ...> = BuilderInternals<
  TMergedDepGraph,       // merged adapter deps
  TMergedLifetimeMap,
  MergeParentProvides<...>,
  TResolvedMaxDepth,
  BoolOr<...>,
  ...,
  ...,
  MergeDepGraphs<GetQueryDepGraph<T1>, GetQueryDepGraph<T2>>,  // merged query deps
>;
```

### Compile-Time Error Example

```typescript
const OrderPort = createQueryPort<Order, { id: string }>()({
  name: "Order",
  dependsOn: [ShippingPort], // Order needs shipping data
});

const ShippingPort = createQueryPort<ShippingRate, { orderId: string }>()({
  name: "Shipping",
  dependsOn: [OrderPort], // Shipping needs order data
});

const graph = GraphBuilder.create()
  .provide(OrderAdapter) // <- compile error here
  .provide(ShippingAdapter)
  .build();

// ERROR: Circular query dependency detected.
// "Order" depends on a query that transitively depends back on "Order".
// Chain: Order -> Shipping -> Order
// Break the cycle by removing one dependsOn declaration or
// using the `enabled` option in useQuery for the dynamic leg.
```

### Transitivity

The cycle detection handles transitive chains:

```typescript
// A -> B -> C -> A (3-deep cycle, still caught at compile time)
const APort = createQueryPort<A, void>()({ name: "A", dependsOn: [CPort] });
const BPort = createQueryPort<B, void>()({ name: "B", dependsOn: [APort] });
const CPort = createQueryPort<C, void>()({ name: "C", dependsOn: [BPort] });
// Compile error when all three adapters are registered in the same graph
```

### Mixed Static/Dynamic Dependencies

Not all dependencies need to be declared in `dependsOn`. The `enabled` option
in `useQuery` remains available for dynamic cases where the dependency is
conditional or determined at runtime:

```typescript
// Static dependency (compile-time validated):
const UserPostsPort = createQueryPort<Post[], { authorId: string }>()({
  name: "UserPosts",
  dependsOn: [UserByIdPort], // Always depends on UserById
});

// Dynamic dependency (runtime-only, not in dependsOn):
const { data: posts } = useQuery(
  SearchPort,
  { query },
  { enabled: query.length >= 3 } // Conditional, not a structural dependency
);
```

The **design principle**: use `dependsOn` for structural dependencies (A always needs
B's data). Use `enabled` for conditional execution (only fetch when user types 3+ chars).

## 48c. Resolution Hooks Integration

Query fetches participate in HexDI's resolution hooks system. When `@hex-di/tracing`
is installed, every adapter resolution during a query fetch produces tracing spans
automatically -- no query-specific instrumentation code needed.

### How It Works

The `QueryClient` resolves query adapters via `container.resolveResult(port)`. This
resolution goes through the standard `HooksRunner`, which fires
`beforeResolve`/`afterResolve` hooks. If `createTracingHook(tracer)` is installed,
each resolution creates a span with `hex-di.*` attributes.

```typescript
// The query fetch resolution chain:
//
// 1. useQuery(UsersPort, params)
// 2. QueryClient.fetch(UsersPort, params)
// 3. container.resolveResult(UsersPort)     <- beforeResolve fires
//    3a. container.resolveResult(HttpClientPort)  <- nested beforeResolve fires
//    3b. HttpClientPort resolved            <- nested afterResolve fires
// 4. UsersPort resolved                    <- afterResolve fires
// 5. fetcher(params, { signal })           <- query-level tracing span
// 6. Cache updated, observers notified
```

### Tracing Span Hierarchy

When both resolution hooks and query-level tracing are active, the span tree looks like:

```
resolve:QueryClient (singleton, cached)
+-- query:fetch:Users
    +-- resolve:UsersPort (adapter resolution)
    |   +-- resolve:HttpClient (dependency resolution)
    +-- http:GET /api/users (adapter-internal span)
```

The `query:fetch:*` spans are emitted by the QueryClient itself using the
`@hex-di/tracing` `Tracer` port. The `resolve:*` spans come from the resolution
hooks system. Together they provide end-to-end traces from component to network.

### Recording Result Outcome on Spans

When tracing is active, the QueryClient records the `Result` outcome on the
`query:fetch:*` span. This enables filtering traces by success/failure and
grouping errors by their `_tag`:

```typescript
// Tracing records Result outcome on span
span.setAttribute("query.result", result.isOk() ? "ok" : "err");
if (result.isErr()) {
  span.setAttribute("query.error_tag", result.error._tag ?? "unknown");
}
```

The full set of Result-aware span attributes:

```typescript
{
  "hex-di.query.port.name": "Users",
  "hex-di.query.params": '{"role":"admin"}',
  "hex-di.query.cache_hit": false,
  "hex-di.query.deduplicated": false,
  "hex-di.query.retry_attempt": 0,
  "hex-di.query.stale_time_ms": 30000,
  "hex-di.query.duration_ms": 142,
  "hex-di.query.result": "ok",           // "ok" or "err" from Result
  "hex-di.query.error_tag": undefined,    // populated on Err with the error's _tag
}
```

### Configuring Query Tracing

```typescript
const graph = GraphBuilder.create()
  // Tracing infrastructure
  .provide(TracerAdapter)
  .provide(
    createAdapter({
      provides: ResolutionHooksPort,
      requires: [TracerPort],
      lifetime: "singleton",
      factory: ({ Tracer: tracer }) => createTracingHook(tracer),
    })
  )

  // Query adapters (resolution automatically traced)
  .provide(RestUsersAdapter)
  .build();
```

### Query-Level Span Attributes

In addition to the standard `hex-di.*` resolution attributes, the QueryClient
emits query-specific attributes on its own spans:

```typescript
{
  "hex-di.query.port.name": "Users",
  "hex-di.query.params": '{"role":"admin"}',
  "hex-di.query.cache_hit": false,
  "hex-di.query.deduplicated": false,
  "hex-di.query.retry_attempt": 0,
  "hex-di.query.stale_time_ms": 30000,
  "hex-di.query.duration_ms": 142,
  "hex-di.query.result": "ok",
  "hex-di.query.structural_sharing_applied": true,
}
```

## 48d. Captive Dependency Rules for Query Adapters

Query adapters follow the same captive dependency rules as regular adapters.
The GraphBuilder detects violations at compile time using template literal error
types that name the exact adapter, port, and lifetime mismatch:

```typescript
/**
 * Compile-time captive dependency error for query adapters.
 * Produces actionable messages naming the specific adapter and dependency.
 */
type ValidateQueryAdapterLifetime<
  TAdapterName extends string,
  TAdapterLifetime extends string,
  TDepName extends string,
  TDepLifetime extends string,
> =
  IsCaptive<TAdapterLifetime, TDepLifetime> extends true
    ? `ERROR: Captive dependency in query adapter "${TAdapterName}". A ${TAdapterLifetime} adapter cannot depend on ${TDepLifetime} port "${TDepName}". Either change "${TAdapterName}" to lifetime: "${TDepLifetime}" or change "${TDepName}" to lifetime: "${TAdapterLifetime}".`
    : TAdapterLifetime;
```

Example compile-time error:

```typescript
// COMPILE ERROR:
// Captive dependency in query adapter "RestUsersAdapter".
// A singleton adapter cannot depend on scoped port "AuthToken".
// Either change "RestUsersAdapter" to lifetime: "scoped"
// or change "AuthToken" to lifetime: "singleton".
const graph = GraphBuilder.create()
  .provide(
    createQueryAdapter(UsersPort, {
      requires: [HttpClientPort, AuthTokenPort], // AuthTokenPort is scoped!
      lifetime: "singleton", // but adapter is singleton
      factory:
        deps =>
        (params, { signal }) => {
          /* ResultAsync */
        },
    })
  )
  .build();

// FIX: Make the adapter scoped to match its dependencies.
const graph = GraphBuilder.create()
  .provide(
    createQueryAdapter(UsersPort, {
      requires: [HttpClientPort, AuthTokenPort],
      lifetime: "scoped", // now matches AuthTokenPort's lifetime
      factory:
        deps =>
        (params, { signal }) => {
          /* ResultAsync */
        },
    })
  )
  .build();
```

## 48e. Adapter Resolution

The QueryClient resolves adapters from its bound container at fetch time. Since the
QueryClient wraps the container directly (not via an intermediate port), the resolution
path is straightforward:

### Resolution Flow

```
1. Component calls useQuery(UsersPort, params)
2. Hook gets QueryClient from QueryClientContext
3. QueryClient checks cache for [UsersPort.name, hash(params)]
4. On miss/stale: QueryClient calls this.container.resolveResult(UsersPort)
5. Result is matched: Ok yields the QueryFetcher, Err yields a QueryResolutionError
6. On Ok: QueryClient calls fetcher(params, { signal })
7. Result stored in cache, observers notified
```

### FetchContext

The `FetchContext` has a clean interface with no container or client references:

```typescript
interface FetchContext {
  readonly signal: AbortSignal;
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly pageParam?: unknown;
  readonly direction?: "forward" | "backward";
}
```

The FetchContext does **not** include a `client` or `containerRef` field. If a fetcher
needs to access other services, those dependencies are declared in the adapter's
`requires` array and injected via the factory.

### Scope Resolution

When a child QueryClient is created via `queryClient.createChild(scope)`, the child's
internal container reference points to the scope. All adapter resolutions from the child
go through the scope, ensuring scoped dependencies are resolved correctly:

```typescript
const scope = container.createScope();
const scopedClient = queryClient.createChild(scope);

// scopedClient.fetch(UsersPort, params) internally calls:
// scope.resolveResult(UsersPort) -> gets scoped adapter with scoped deps
```

### Disposed Scope Safety

When a scope is disposed, its child QueryClient is also disposed. Any subsequent
operations return `ResultAsync.err({ _tag: "QueryDisposed" })`:

```typescript
scope.dispose();
const result = await scopedClient.fetch(UsersPort, {});
// result is Err({ _tag: "QueryDisposed", portName: "Users" })
```

---

_Previous: [09b - Query Introspection](./09b-introspection.md)_

_Next: [11 - React Integration](./11-react-integration.md)_
