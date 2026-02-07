# 05 - Query Adapters

## 19. createQueryAdapter

A query adapter implements how to fetch data for a specific QueryPort. It is a real HexDI `Adapter` with `"async"` factory mode.

### Factory Signature

```typescript
function createQueryAdapter<
  TData,
  TParams,
  TError,
  const TName extends string,
  const TRequires extends ReadonlyArray<Port<unknown, string>> = [],
>(
  port: QueryPort<TName, TData, TParams, TError>,
  config: {
    readonly requires?: TRequires;
    readonly lifetime?: Lifetime;
    readonly factory: (
      deps: ResolvedDeps<TupleToUnion<TRequires>>
    ) => QueryFetcher<TData, TParams, TError>;
  }
): Adapter<
  QueryPort<TName, TData, TParams, TError>,
  TupleToUnion<TRequires>,
  typeof config.lifetime extends string ? typeof config.lifetime : "singleton",
  "async"
>;
```

> **Design note:** The original draft used unparameterized `ResolvedDeps` which loses
> type safety on the `deps` object. The corrected signature uses
> `ResolvedDeps<TupleToUnion<TRequires>>` following the pattern established in
> `@hex-di/core/src/adapters/types.ts`. This ensures factory deps are mapped from
> the port tuple: `{ HttpClient: HttpClientService; Logger: LoggerService }`.

### Recommended Lifetime

The default lifetime for query adapters is `"singleton"`. This is correct for most
cases because the adapter factory returns a stateless fetcher function. However:

| Lifetime                | When to Use                                              |
| ----------------------- | -------------------------------------------------------- |
| `"singleton"` (default) | Stateless fetcher. All dependencies are also singletons. |
| `"scoped"`              | Fetcher depends on scoped ports (e.g., `AuthTokenPort`). |
| `"transient"`           | Rare. Each fetch creates a fresh adapter instance.       |

**Captive dependency rule:** If a query adapter is `"singleton"` but declares a
`"scoped"` port in `requires`, the GraphBuilder will report a captive dependency
error at compile time -- identical to regular adapter validation. Use
`lifetime: "scoped"` for the adapter when it depends on scoped ports.

### QueryFetcher Type

```typescript
type QueryFetcher<TData, TParams, TError> = (
  params: TParams,
  context: FetchContext
) => ResultAsync<TData, TError>;
```

The factory receives resolved dependencies and returns a `QueryFetcher` -- a function that takes params and a fetch context and returns a `ResultAsync`.

### Examples

```typescript
// REST adapter with HTTP client dependency
const RestUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: httpClient }) =>
    (params, { signal }) =>
      ResultAsync.fromPromise(
        httpClient
          .get("/api/users", {
            params: { role: params.role, page: params.page },
            signal,
          })
          .then(r => r.data),
        error => classifyHttpError(error)
      ),
});

// GraphQL adapter
const GraphQLUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [GraphQLClientPort],
  factory:
    ({ GraphQLClient: graphql }) =>
    (params, { signal }) =>
      graphql
        .query({ query: USERS_QUERY, variables: params, context: { fetchOptions: { signal } } })
        .map(result => result.data.users),
});

// Mock adapter (no dependencies)
const MockUsersAdapter = createQueryAdapter(UsersPort, {
  factory: () => params => {
    const users = [
      { id: "1", name: "Alice", role: "admin" },
      { id: "2", name: "Bob", role: "user" },
    ];
    return ResultAsync.ok(params.role ? users.filter(u => u.role === params.role) : users);
  },
});

// Adapter with multiple dependencies
const CachedUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort, LocalStoragePort, LoggerPort],
  factory:
    ({ HttpClient: httpClient, LocalStorage: localStorage, Logger: logger }) =>
    (params, { signal }) => {
      const cacheKey = `users:${JSON.stringify(params)}`;
      const cached = localStorage.get(cacheKey);
      if (cached) {
        logger.debug("Local cache hit for users");
        return ResultAsync.ok(cached);
      }
      logger.debug("Fetching users from API");
      return ResultAsync.fromPromise(
        httpClient.get("/api/users", { params, signal }).then(r => r.data),
        error => classifyHttpError(error)
      ).map(data => {
        localStorage.set(cacheKey, data);
        return data;
      });
    },
});
```

### fromPromise Bridge

When wrapping existing throwing libraries (e.g., `axios`, `fetch`), use `ResultAsync.fromPromise` to convert `Promise<TData>` (that throws on error) into `ResultAsync<TData, TError>`:

```typescript
const RestUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: httpClient }) =>
    (params, { signal }) =>
      ResultAsync.fromPromise(
        httpClient.get("/api/users", { params, signal }).then(r => r.data),
        error => classifyHttpError(error)
      ),
});

function classifyHttpError(error: unknown): ApiError {
  if (error instanceof HttpError) {
    return { _tag: "ApiError", status: error.status, message: error.message };
  }
  return { _tag: "ApiError", status: 500, message: "Unknown error" };
}
```

## 20. FetchContext

Every query fetcher receives a `FetchContext` providing cancellation support and metadata:

```typescript
interface FetchContext {
  /** AbortSignal for cancellation */
  readonly signal: AbortSignal;

  /** Custom metadata passed to the fetcher */
  readonly meta?: Readonly<Record<string, unknown>>;

  /** Page parameter for infinite queries */
  readonly pageParam?: unknown;

  /** Direction for infinite queries ("forward" | "backward") */
  readonly direction?: "forward" | "backward";
}
```

> **Design note:** The original draft included `readonly client: QueryClient` in FetchContext.
> This was removed because it creates a hidden dependency that bypasses the explicit `requires`
> declaration in adapters. If a fetcher needs to perform dependent prefetches or access other
> queries, it should declare those dependencies via the adapter's `requires` array. This
> maintains the hexagonal architecture principle that all dependencies are explicit and
> visible in the dependency graph.

### Signal Usage

The signal enables cooperative cancellation. When a query is cancelled (component unmount, manual cancel, dedup replacement), the signal fires:

```typescript
const RestUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: httpClient }) =>
    (params, { signal }) =>
      ResultAsync.fromPromise(
        httpClient.get("/api/users", { params, signal }).then(r => r.data),
        error => classifyHttpError(error)
      ),
});
```

## 21. Adapter Composition

Query adapters are standard HexDI adapters and compose naturally in the graph:

```typescript
const graph = GraphBuilder.create()
  // Infrastructure
  .provide(HttpClientAdapter)
  .provide(AuthInterceptorAdapter)
  .provide(LoggerAdapter)

  // Query infrastructure

  // Query adapters
  .provide(RestUsersAdapter)
  .provide(RestProductsAdapter)
  .provide(RestOrdersAdapter)

  // Mutation adapters
  .provide(RestCreateUserAdapter)
  .provide(RestUpdateUserAdapter)
  .provide(RestDeleteUserAdapter)

  .build();
```

### Adapter Swapping

The same port can be implemented by different adapters in different graphs:

```typescript
// Production: REST backend
const prodGraph = GraphBuilder.create()
  .provide(HttpClientAdapter)
  .provide(RestUsersAdapter)

  .build();

// Test: mock data
const testGraph = GraphBuilder.create()
  .provide(MockUsersAdapter)

  .build();

// Staging: GraphQL backend
const stagingGraph = GraphBuilder.create()
  .provide(GraphQLClientAdapter)
  .provide(GraphQLUsersAdapter)

  .build();
```

## 22. Streamed Queries

For data sources that emit values over time (Server-Sent Events, WebSockets, AI completions), HexDI Query provides streamed query adapters.

### Factory

```typescript
function createStreamedQueryAdapter<
  TData,
  TParams,
  TError,
  TChunk,
  const TName extends string,
  const TRequires extends ReadonlyArray<Port<unknown, string>> = [],
>(
  port: QueryPort<TName, TData, TParams, TError>,
  config: {
    readonly requires?: TRequires;
    readonly lifetime?: Lifetime;
    readonly factory: (
      deps: ResolvedDeps<TupleToUnion<TRequires>>
    ) => StreamedFetcher<TData, TParams, TError, TChunk>;
  }
): Adapter<
  QueryPort<TName, TData, TParams, TError>,
  TupleToUnion<TRequires>,
  typeof config.lifetime extends string ? typeof config.lifetime : "singleton",
  "async"
>;

type StreamedFetcher<TData, TParams, TError, TChunk> = (
  params: TParams,
  context: FetchContext
) => ResultAsync<
  {
    stream: AsyncIterable<TChunk>;
    reducer: (acc: TData, chunk: TChunk) => TData;
    initialValue: TData;
    refetchMode?: "reset" | "append" | "replace";
  },
  TError
>;
```

### Behavior

- The query enters `pending` state until the first chunk arrives
- After the first chunk, the query moves to `success` with partial data
- The query remains in `fetchStatus: "fetching"` until the stream completes
- On refetch: `"reset"` clears data first, `"append"` adds to existing, `"replace"` swaps atomically when done

### Example: AI Chat Completion

```typescript
const ChatCompletionPort = createQueryPort<string, { prompt: string }>()({
  name: "ChatCompletion",
  defaults: { cacheTime: 0 },
});

const StreamedChatAdapter = createStreamedQueryAdapter(ChatCompletionPort, {
  requires: [AiClientPort],
  factory:
    ({ AiClient: ai }) =>
    (params, { signal }) =>
      ResultAsync.ok({
        stream: ai.streamCompletion(params.prompt, { signal }),
        reducer: (acc, chunk) => acc + chunk,
        initialValue: "",
        refetchMode: "reset",
      }),
});
```

### Example: Live Price Feed

```typescript
const PricesPort = createQueryPort<PriceUpdate[], void>()({
  name: "Prices",
  defaults: { staleTime: Infinity },
});

const LivePricesAdapter = createStreamedQueryAdapter(PricesPort, {
  requires: [WebSocketPort],
  factory:
    ({ WebSocket: ws }) =>
    (_params, { signal }) =>
      ResultAsync.ok({
        stream: ws.subscribe("prices", { signal }),
        reducer: (prices, update) => {
          const idx = prices.findIndex(p => p.symbol === update.symbol);
          return idx >= 0
            ? [...prices.slice(0, idx), update, ...prices.slice(idx + 1)]
            : [...prices, update];
        },
        initialValue: [],
        refetchMode: "reset",
      }),
});
```

---

_Previous: [04 - Mutation Ports](./04-mutation-ports.md)_

_Next: [06 - Mutation Adapters](./06-mutation-adapters.md)_
