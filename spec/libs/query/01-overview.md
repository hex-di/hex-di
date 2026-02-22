# 01 - Overview & Philosophy

## 1. Overview

`@hex-di/query` extends HexDI with data fetching and caching that respects hexagonal architecture. Every query source is a real `DirectedPort`, every fetch implementation is a real `Adapter`, and Container is the single runtime managing resolution, scoping, and disposal.

There is no global `queryFn` callback. There is no string-based query key. There is no fetch logic in components. Data is resolved from Container like any other service:

```typescript
const queryClient = createQueryClient(container);
const users = await queryClient.fetch(UsersPort, { role: "admin" });
```

### What this package provides

- **Query ports** (`createQueryPort`) that return `DirectedPort<QueryFetcher<TData, TParams, TError>, TName, "inbound">`
- **Mutation ports** (`createMutationPort`) that return `DirectedPort<MutationExecutor<TData, TInput>, TName, "inbound">`
- **Query adapters** (`createQueryAdapter`) and **mutation adapters** (`createMutationAdapter`) that return `Adapter<TProvides, TRequires, TLifetime, "async">`
- **Signal-based reactivity** powered by `alien-signals/system` with per-scope isolated reactive systems, glitch-free propagation, and container-scoped batching
- **QueryClient** with caching, deduplication, background refresh, retry, and garbage collection
- **Structural sharing** for referential stability across re-renders
- **Compile-time query dependency validation** (`dependsOn`) with cycle detection via `IsReachable<>`
- **Streamed query support** for AsyncIterable data sources (SSE, WebSockets, AI completions)
- **Query introspection** (`QueryInspectorPort`) for runtime visibility into cache state, fetch history, deduplication map, and invalidation events
- **React hooks** (`useQuery`, `useMutation`, `useQueries`, `useSuspenseQuery`, `useInfiniteQuery`) in `@hex-di/query-react`
- **Test utilities** (mock adapters, query assertions, cache-isolated test helpers) in `@hex-di/query-testing`

### What this package does NOT provide

- No QueryClient as a port in the dependency graph (it wraps the container)
- No global fetch function configuration
- No string-based query keys (`["users", { role: "admin" }]`)
- No `queryFn` in hooks -- fetching logic lives in adapters
- No custom QueryPort types that bypass core Port
- No server-side data fetching (use route loaders or RSC)
- No GraphQL client (but can wrap one as an adapter)
- No ORM or database abstraction

### 0.1.0 Scope

- `createQueryPort` / `createQueryAdapter` -- typed data contracts with fetch implementations
- `createMutationPort` / `createMutationAdapter` -- typed mutations with cache effects
- QueryClient with cache, deduplication, retry, and GC
- Structural sharing for referential stability
- Compile-time query dependency validation (`dependsOn` with cycle detection)
- Streamed query support for AsyncIterable sources
- Cache persistence port for offline support
- Container lifecycle integration (scoping, disposal)
- React hooks (`useQuery`, `useMutation`, `useQueries`, `useSuspenseQuery`, `useInfiniteQuery`)
- Testing utilities (mock adapters, query assertions, fetch recorder)
- Query introspection (`QueryInspectorPort`)
- Optimistic updates, pagination, prefetching, polling patterns

## 2. Philosophy

### Data is a service

In HexDI, services are provided through ports and implemented by adapters. Remote data is no different. A user list is a service that provides data on demand. The port defines the contract (data shape, parameter types, defaults). The adapter provides the implementation (REST call, GraphQL query, local storage read, mock response).

### Ports are the query key

Traditional query libraries use string-based keys (`["users", { role: "admin" }]`) to identify cached data. Keys are stringly-typed, duplicated across components, and provide no compile-time validation.

In HexDI Query, the **port IS the key**. `UsersPort` is a unique, type-safe identifier. Combined with serialized parameters, it produces a deterministic cache key. There are no key factories, no key duplication, no key mismatches.

```typescript
// Traditional: string-based, no compile-time safety
useQuery(["users", { role: "admin" }], fetchUsers);

// HexDI: port-based, fully typed
useQuery(UsersPort, { role: "admin" });
```

### Adapters replace queryFn

Traditional query libraries couple fetch logic to components:

```typescript
// Component knows URLs, HTTP methods, response parsing
const { data } = useQuery(["users"], () => fetch("/api/users").then(r => r.json()));
```

HexDI Query separates the contract from the implementation:

```typescript
// Port: declares WHAT data is needed
const UsersPort = createQueryPort<User[], { role?: string }>()({
  name: "Users",
});

// Adapter: declares HOW to fetch it, with DI dependencies
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

// Component: declares WHAT it needs, nothing about HOW
const { data } = useQuery(UsersPort, { role: "admin" });
```

Benefits:

1. **Testability** -- swap `RestUsersAdapter` for `MockUsersAdapter` without touching components
2. **Flexibility** -- change REST to GraphQL by swapping one adapter
3. **DI integration** -- adapters declare dependencies on `HttpClientPort`, `AuthPort`, `LoggerPort`
4. **Multi-tenancy** -- different graphs per tenant with different backend URLs
5. **Type safety** -- ports enforce data contracts at compile time

### Container is the runtime

HexDI's Container already manages instance creation, scoping, disposal, and dependency resolution. The QueryClient wraps the container as an extension -- it is not a port in the graph. Query adapters are resolved on-demand when fetches execute. This means:

- The QueryClient receives the container at construction time (`createQueryClient(container)`)
- Each scope gets a child QueryClient with its own isolated cache (`queryClient.createChild(scope)`)
- Container disposal cleans up cache subscriptions and pending fetches
- Container scoping creates isolated query contexts via child clients

### Infrastructure ports replace middleware

Traditional query libraries use middleware/interceptors for cross-cutting concerns:

```typescript
// Global interceptor: no DI, no scoping, hard to test
axios.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});
```

In HexDI, infrastructure is ports:

```typescript
// AuthInterceptorPort: regular Port with DI dependencies
const AuthInterceptorAdapter = createAdapter({
  provides: AuthInterceptorPort,
  requires: [AuthTokenPort],
  lifetime: "scoped",
  factory: ({ authToken }) => ({
    intercept: config => ({
      ...config,
      headers: { ...config.headers, Authorization: `Bearer ${authToken}` },
    }),
  }),
});
```

Query adapters depend on infrastructure ports. Infrastructure ports participate in the dependency graph. Everything is scoped, typed, and testable.

### Errors are values

Adapters return `ResultAsync<TData, TError>` instead of throwing. The error channel is structural -- `TError` flows through signatures, not just as a phantom type. QueryClient preserves typed errors through caching, retry, and invalidation. Consumers get exhaustive error handling via `_tag` discrimination.

## 3. Package Structure

```
query/
├── core/                        # @hex-di/query
│   ├── src/
│   │   ├── ports/
│   │   │   ├── query-port.ts    # createQueryPort factory
│   │   │   ├── mutation-port.ts # createMutationPort factory
│   │   │   └── types.ts         # Port type definitions
│   │   ├── adapters/
│   │   │   ├── query-adapter.ts     # createQueryAdapter factory
│   │   │   ├── mutation-adapter.ts  # createMutationAdapter factory
│   │   │   ├── streamed-adapter.ts  # createStreamedQueryAdapter factory
│   │   │   └── types.ts             # Adapter type definitions
│   │   ├── reactivity/
│   │   │   ├── signals.ts       # Signal/Computed/Effect wrappers over alien-signals
│   │   │   ├── system-factory.ts # createIsolatedReactiveSystem() factory
│   │   │   └── batch.ts         # Container-scoped batching with cross-scope detection
│   │   ├── cache/
│   │   │   ├── cache.ts         # QueryCache implementation (signal-backed entries)
│   │   │   ├── entry.ts         # CacheEntry type and reactive entry factory
│   │   │   ├── key.ts           # Cache key serialization
│   │   │   ├── sharing.ts       # Structural sharing (replaceEqualDeep)
│   │   │   └── gc.ts            # Garbage collector (subscriber-tracked via signals)
│   │   ├── client/
│   │   │   ├── client.ts        # QueryClient implementation
│   │   │   ├── dedup.ts         # Deduplication manager
│   │   │   ├── factory.ts       # createQueryClient factory
│   │   │   └── types.ts         # Client type definitions
│   │   ├── inspector/
│   │   │   ├── inspector.ts     # QueryInspector implementation
│   │   │   ├── port.ts          # QueryInspectorPort
│   │   │   ├── snapshot.ts      # QuerySnapshot types
│   │   │   └── events.ts        # QueryInspectorEvent types
│   │   ├── types/
│   │   │   ├── state.ts         # QueryState, MutationState
│   │   │   ├── options.ts       # Configuration options
│   │   │   └── utils.ts         # Utility types (Infer*, etc.)
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── react/                       # @hex-di/query-react
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── use-query.ts
│   │   │   ├── use-mutation.ts
│   │   │   ├── use-queries.ts
│   │   │   ├── use-infinite-query.ts
│   │   │   ├── use-query-client.ts
│   │   │   ├── use-is-fetching.ts
│   │   │   └── use-is-mutating.ts
│   │   ├── suspense/
│   │   │   └── use-suspense-query.ts
│   │   ├── provider/
│   │   │   ├── query-client-provider.tsx
│   │   │   └── context.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── testing/                     # @hex-di/query-testing
│   ├── src/
│   │   ├── mock-query-adapter.ts
│   │   ├── mock-mutation-adapter.ts
│   │   ├── query-test-container.ts
│   │   ├── fetch-recorder.ts
│   │   ├── query-assertions.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── devtools/                    # @hex-di/query-devtools (0.2.0)
    ├── src/
    │   ├── panel/
    │   ├── overlay/
    │   └── index.ts
    └── package.json
```

### Dependency Graph

```
                    @hex-di/core
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    @hex-di/graph   @hex-di/runtime  @hex-di/react
          │              │              │
          └──────────────┼──────────────┘
                         │
                    @hex-di/result
                         │
                         ▼
                  @hex-di/query ◀── alien-signals (peer)
                    │         │
                    │    (optional)
                    │         ▼
                    │   @hex-di/tracing
                    │
              ┌─────┼──────────────┐
              ▼     ▼              ▼
    @hex-di/      @hex-di/       @hex-di/
    query-react   query-testing  query-devtools
```

### Package Dependencies

| Package                  | Dependencies                                      | Peer Dependencies      |
| ------------------------ | ------------------------------------------------- | ---------------------- |
| `@hex-di/query`          | `@hex-di/core`, `@hex-di/graph`, `@hex-di/result` | `alien-signals >= 1.0` |
| `@hex-di/query-react`    | `@hex-di/query`, `@hex-di/react`                  | `react >= 18`          |
| `@hex-di/query-testing`  | `@hex-di/query`, `@hex-di/testing`                | -                      |
| `@hex-di/query-devtools` | `@hex-di/query`                                   | -                      |

**Optional integration:** When `@hex-di/tracing` is in the graph, query fetches
automatically produce tracing spans via the resolution hooks system. No explicit
dependency is required -- the integration is hook-based.

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              React Components                               │
│  useQuery  useMutation  useQueries  useSuspenseQuery  useInfiniteQuery      │
├─────────────────────────────────────────────────────────────────────────────┤
│                          @hex-di/query-react                                │
│              (hooks resolve QueryClient from Container)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                       Container (single runtime)                            │
│                                                                             │
│  ┌──────────────────┐  ┌────────────────────────────┐                      │
│  │ QueryInspectorPort│  │ Infrastructure Ports       │                      │
│  │ (singleton)       │  │ HttpClient, Auth, Logger  │                      │
│  └──────────────────┘  └────────────────────────────┘                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                   QueryClient (wraps Container, not a port)                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │                     QueryClient                              │           │
│  │                                                              │           │
│  │  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐ │           │
│  │  │QueryCache│  │DedupManager│  │  Retry   │  │    GC    │ │           │
│  │  │(signals) │  └────────────┘  └──────────┘  └──────────┘ │           │
│  │  └──────────┘                                               │           │
│  │  ┌──────────────────────────────────────────────────────┐   │           │
│  │  │ ReactiveSystem (alien-signals/system, per-scope)     │   │           │
│  │  │  signal() · computed() · effect() · batch()          │   │           │
│  │  └──────────────────────────────────────────────────────┘   │           │
│  └──────────────────────┬──────────────────────────────────────┘           │
│                         │                                                   │
│           ┌─────────────┼─────────────────────┐                            │
│           ▼             ▼                     ▼                            │
│  ┌─────────────┐ ┌─────────────┐    ┌─────────────────┐                   │
│  │ UsersQuery  │ │ProductQuery │    │ CreateUserMut   │                   │
│  │ Adapter     │ │ Adapter     │    │ Adapter          │                   │
│  │ (REST)      │ │ (GraphQL)   │    │ (REST)           │                   │
│  └─────────────┘ └─────────────┘    └─────────────────┘                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                              PORTS (Contracts)                              │
│                                                                             │
│  QueryPort<Name, Data, Params>     MutationPort<Name, Result, Input>       │
│  Define WHAT data is needed        Define WHAT operation to perform         │
├─────────────────────────────────────────────────────────────────────────────┤
│                              ADAPTERS (Implementations)                     │
│                                                                             │
│  REST - GraphQL - gRPC - LocalStorage - WebSocket - SSE - Mock             │
│  Implement HOW to fetch/mutate data, with DI dependencies                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Result Integration

`@hex-di/query` depends on `@hex-di/result` for typed error handling:

- **Adapters** return `ResultAsync<TData, TError>` instead of `Promise<TData>`. The error type is structural, not phantom.
- **QueryClient** methods (`fetch`, `mutate`, `ensureQueryData`, `prefetch`) return `ResultAsync<TData, TError | QueryResolutionError>`. Infrastructure errors are expressed as a tagged union.
- **React hooks** expose a `result: Result<TData, TError> | undefined` field alongside the existing `data`/`error` split for convenience.
- **6 error classes** (`QueryFetchError`, `QueryCancelledError`, etc.) are replaced by a single `QueryResolutionError` tagged union with `_tag` discriminant.

---

_Next: [02 - Core Concepts](./02-core-concepts.md)_
