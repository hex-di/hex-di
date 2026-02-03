# HexDI Query Specification

**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-01
**Last Updated:** 2026-02-01

---

## Table of Contents

1. [Overview](#1-overview)
2. [Philosophy](#2-philosophy)
3. [Package Structure](#3-package-structure)
4. [Core Concepts](#4-core-concepts)
5. [Query Ports](#5-query-ports)
6. [Mutation Ports](#6-mutation-ports)
7. [Query Adapters](#7-query-adapters)
8. [Mutation Adapters](#8-mutation-adapters)
9. [Cache Architecture](#9-cache-architecture)
10. [Query Lifecycle](#10-query-lifecycle)
11. [Query States](#11-query-states)
12. [Deduplication](#12-deduplication)
13. [Invalidation](#13-invalidation)
14. [Query Client](#14-query-client)
15. [HexDI Integration](#15-hexdi-integration)
16. [React Integration](#16-react-integration)
17. [Testing Patterns](#17-testing-patterns)
18. [Advanced Patterns](#18-advanced-patterns)
19. [API Reference](#19-api-reference)
20. [Migration Guide](#20-migration-guide)

---

## 1. Overview

HexDI Query is a data fetching and caching library that applies hexagonal architecture principles to client-side data management. It separates **what** data is needed (ports) from **how** to fetch it (adapters), enabling:

- Type-safe data contracts
- Swappable data sources
- Dependency injection for fetchers
- Easy testing without mocking network layer
- Multi-tenant support via graph composition

### 1.1 Goals

1. **Hexagonal data fetching** - Ports define contracts, adapters implement fetching
2. **Full HexDI integration** - Query adapters are regular HexDI adapters
3. **Zero configuration testing** - Swap adapters, not fetch implementations
4. **Type safety** - Compile-time validation of query parameters and return types
5. **Framework agnostic core** - React bindings as separate package

### 1.2 Non-Goals

1. Not a replacement for server-side data fetching (use loaders/RSC)
2. Not a GraphQL client (but can wrap one)
3. Not an ORM or database abstraction

---

## 2. Philosophy

### 2.1 Hexagonal Architecture for Data

Traditional data fetching libraries couple components directly to fetch logic:

```typescript
// Traditional: Component knows HOW to fetch
function UsersList() {
  const { data } = useQuery(["users"], () => fetch("/api/users").then(r => r.json()));
}
```

HexDI Query separates concerns:

```typescript
// HexDI Query: Component knows WHAT it needs, not HOW to get it
function UsersList() {
  const { data } = useQuery(UsersPort, {});
}
```

### 2.2 The Port/Adapter Pattern for Queries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION                                     │
│                                                                             │
│   Components depend on QueryPorts (contracts)                               │
│   They never import fetch logic or API URLs                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              QUERY RUNTIME                                   │
│                                                                             │
│   Caching • Deduplication • Background refresh • Retries • GC              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PORTS (Contracts)                               │
│                                                                             │
│   QueryPort<Name, Data, Params>     MutationPort<Name, Result, Input>       │
│   Define WHAT data is needed        Define WHAT operation to perform        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADAPTERS (Implementations)                      │
│                                                                             │
│   REST • GraphQL • gRPC • LocalStorage • WebSocket • Mock                   │
│   Implement HOW to fetch/mutate data                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Benefits

| Benefit           | Description                                             |
| ----------------- | ------------------------------------------------------- |
| **Testability**   | Swap REST adapter for mock adapter, no MSW needed       |
| **Flexibility**   | Change from REST to GraphQL without touching components |
| **Multi-tenancy** | Different graphs per tenant with different backends     |
| **Type safety**   | Ports enforce data contracts at compile time            |
| **Consistency**   | Same DI patterns as rest of application                 |

---

## 3. Package Structure

```
query/
├── core/                        # @hex-di/query
│   ├── src/
│   │   ├── ports/
│   │   │   ├── query-port.ts   # createQueryPort factory
│   │   │   ├── mutation-port.ts# createMutationPort factory
│   │   │   └── types.ts        # Port type definitions
│   │   ├── adapters/
│   │   │   ├── query-adapter.ts    # createQueryAdapter factory
│   │   │   ├── mutation-adapter.ts # createMutationAdapter factory
│   │   │   └── types.ts            # Adapter type definitions
│   │   ├── cache/
│   │   │   ├── cache.ts        # QueryCache implementation
│   │   │   ├── entry.ts        # CacheEntry type and utilities
│   │   │   ├── key.ts          # Cache key serialization
│   │   │   └── gc.ts           # Garbage collector
│   │   ├── client/
│   │   │   ├── client.ts       # QueryClient implementation
│   │   │   ├── dedup.ts        # Deduplication manager
│   │   │   └── types.ts        # Client type definitions
│   │   ├── types/
│   │   │   ├── state.ts        # QueryState, MutationState
│   │   │   ├── options.ts      # Configuration options
│   │   │   └── utils.ts        # Utility types (Infer*, etc.)
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
│   │   │   └── use-is-fetching.ts
│   │   ├── provider/
│   │   │   ├── query-provider.tsx
│   │   │   └── context.ts
│   │   ├── suspense/
│   │   │   └── use-suspense-query.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── devtools/                    # @hex-di/query-devtools (future)
    ├── src/
    │   ├── panel/              # Browser devtools panel
    │   ├── overlay/            # In-app inspector overlay
    │   └── index.ts
    └── package.json
```

### 3.1 Dependency Graph

```
                    @hex-di/core
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    @hex-di/graph   @hex-di/runtime  @hex-di/react
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                  @hex-di/query
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
    @hex-di/query-react    @hex-di/query-devtools
```

### 3.2 Package Dependencies

| Package                  | Dependencies                     | Peer Dependencies |
| ------------------------ | -------------------------------- | ----------------- |
| `@hex-di/query`          | `@hex-di/core`                   | -                 |
| `@hex-di/query-react`    | `@hex-di/query`, `@hex-di/react` | `react`           |
| `@hex-di/query-devtools` | `@hex-di/query`                  | -                 |

---

## 4. Core Concepts

### 4.1 QueryPort

A **QueryPort** declares what data is needed and its shape. It does not contain fetch logic.

```typescript
const UsersPort = createQueryPort<"Users", User[], { role?: string }>({
  name: "Users",
});
```

### 4.2 MutationPort

A **MutationPort** declares what operation can be performed and its effects on the cache.

```typescript
const CreateUserPort = createMutationPort<"CreateUser", User, CreateUserInput>({
  name: "CreateUser",
  effects: { invalidates: [UsersPort] },
});
```

### 4.3 QueryAdapter

A **QueryAdapter** implements how to fetch data for a QueryPort.

```typescript
const RestUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort],
  factory: deps => async params => {
    const res = await deps.httpClient.get("/users", { params });
    return res.data;
  },
});
```

### 4.4 MutationAdapter

A **MutationAdapter** implements how to perform a mutation.

```typescript
const RestCreateUserAdapter = createMutationAdapter(CreateUserPort, {
  requires: [HttpClientPort],
  factory: deps => async input => {
    const res = await deps.httpClient.post("/users", input);
    return res.data;
  },
});
```

### 4.5 QueryClient

The **QueryClient** orchestrates caching, deduplication, and query execution.

### 4.6 QueryCache

The **QueryCache** stores query results and manages staleness.

---

## 5. Query Ports

### 5.1 Type Definition

```typescript
interface QueryPort<Name extends string, TData, TParams = void, TError = Error> {
  readonly _tag: "QueryPort";
  readonly name: Name;
  readonly _types: {
    readonly data: TData;
    readonly params: TParams;
    readonly error: TError;
  };
  readonly defaults?: QueryDefaults;
}

interface QueryDefaults {
  /** Time in ms before data is considered stale (default: 0) */
  readonly staleTime?: number;

  /** Time in ms to keep unused data in cache (default: 300000 / 5 min) */
  readonly cacheTime?: number;

  /** Refetch when component mounts (default: true) */
  readonly refetchOnMount?: boolean | "always";

  /** Refetch when window regains focus (default: true) */
  readonly refetchOnWindowFocus?: boolean | "always";

  /** Refetch interval in ms (default: false) */
  readonly refetchInterval?: number | false;

  /** Number of retry attempts (default: 3) */
  readonly retry?: number | boolean;

  /** Delay between retries in ms (default: exponential backoff) */
  readonly retryDelay?: number | ((attempt: number, error: TError) => number);
}
```

### 5.2 Factory Function

```typescript
function createQueryPort<Name extends string, TData, TParams = void, TError = Error>(config: {
  name: Name;
  defaults?: QueryDefaults;
}): QueryPort<Name, TData, TParams, TError>;
```

### 5.3 Examples

```typescript
// Simple query - no parameters
const CurrentUserPort = createQueryPort<"CurrentUser", User>({
  name: "CurrentUser",
  defaults: {
    staleTime: 60_000, // 1 minute
    cacheTime: 300_000, // 5 minutes
  },
});

// Query with parameters
const UsersPort = createQueryPort<"Users", User[], { role?: string; page?: number }>({
  name: "Users",
  defaults: {
    staleTime: 30_000,
  },
});

// Query with custom error type
const UserByIdPort = createQueryPort<"UserById", User, { id: string }, ApiError>({
  name: "UserById",
  defaults: {
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
  },
});

// Query with no caching
const HealthCheckPort = createQueryPort<"HealthCheck", { status: string }>({
  name: "HealthCheck",
  defaults: {
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: false,
  },
});
```

### 5.4 Type Inference Utilities

```typescript
// Extract types from a QueryPort
type InferQueryData<P> = P extends QueryPort<any, infer D, any, any> ? D : never;
type InferQueryParams<P> = P extends QueryPort<any, any, infer P, any> ? P : never;
type InferQueryError<P> = P extends QueryPort<any, any, any, infer E> ? E : never;
type InferQueryName<P> = P extends QueryPort<infer N, any, any, any> ? N : never;

// Usage
type Users = InferQueryData<typeof UsersPort>; // User[]
type UsersParams = InferQueryParams<typeof UsersPort>; // { role?: string; page?: number }
```

---

## 6. Mutation Ports

### 6.1 Type Definition

```typescript
interface MutationPort<Name extends string, TData, TInput, TError = Error, TContext = unknown> {
  readonly _tag: "MutationPort";
  readonly name: Name;
  readonly _types: {
    readonly data: TData;
    readonly input: TInput;
    readonly error: TError;
    readonly context: TContext;
  };
  readonly effects?: MutationEffects;
}

interface MutationEffects {
  /** Query ports to invalidate on success */
  readonly invalidates?: ReadonlyArray<QueryPort<any, any, any, any>>;

  /** Query ports to remove from cache on success */
  readonly removes?: ReadonlyArray<QueryPort<any, any, any, any>>;

  /** Enable optimistic updates (default: false) */
  readonly optimistic?: boolean;
}
```

### 6.2 Factory Function

```typescript
function createMutationPort<
  Name extends string,
  TData,
  TInput,
  TError = Error,
  TContext = unknown,
>(config: {
  name: Name;
  effects?: MutationEffects;
}): MutationPort<Name, TData, TInput, TError, TContext>;
```

### 6.3 Examples

```typescript
// Simple mutation
const CreateUserPort = createMutationPort<"CreateUser", User, CreateUserInput>({
  name: "CreateUser",
  effects: {
    invalidates: [UsersPort],
  },
});

// Mutation that removes specific cache entries
const DeleteUserPort = createMutationPort<"DeleteUser", void, { id: string }>({
  name: "DeleteUser",
  effects: {
    invalidates: [UsersPort],
    removes: [UserByIdPort],
  },
});

// Mutation with optimistic updates
const UpdateUserPort = createMutationPort<
  "UpdateUser",
  User,
  UpdateUserInput,
  ApiError,
  { previousUser: User } // Context for rollback
>({
  name: "UpdateUser",
  effects: {
    optimistic: true,
  },
});

// Mutation with no cache effects
const SendEmailPort = createMutationPort<"SendEmail", void, EmailInput>({
  name: "SendEmail",
  // No effects - doesn't affect any cached data
});
```

### 6.4 Type Inference Utilities

```typescript
type InferMutationData<P> = P extends MutationPort<any, infer D, any, any, any> ? D : never;
type InferMutationInput<P> = P extends MutationPort<any, any, infer I, any, any> ? I : never;
type InferMutationError<P> = P extends MutationPort<any, any, any, infer E, any> ? E : never;
type InferMutationContext<P> = P extends MutationPort<any, any, any, any, infer C> ? C : never;
```

---

## 7. Query Adapters

### 7.1 Type Definition

```typescript
interface QueryAdapter<P extends QueryPort<any, any, any, any>> {
  readonly _tag: "QueryAdapter";
  readonly port: P;
  readonly fetch: QueryFetcher<P>;
}

type QueryFetcher<P extends QueryPort<any, any, any, any>> = (
  params: InferQueryParams<P>,
  context: FetchContext
) => Promise<InferQueryData<P>>;

interface FetchContext {
  /** AbortSignal for cancellation */
  readonly signal: AbortSignal;

  /** Custom metadata passed to the fetcher */
  readonly meta?: Record<string, unknown>;
}
```

### 7.2 Factory Function

```typescript
function createQueryAdapter<
  P extends QueryPort<any, any, any, any>,
  Deps extends Record<string, Port<any, any>> = Record<string, never>,
>(
  port: P,
  config: {
    requires?: PortsTuple<Deps>;
    factory: (deps: ResolvedDeps<Deps>) => QueryFetcher<P>;
  }
): QueryAdapter<P> & Adapter<P, InferQueryData<P>>;
```

### 7.3 Examples

```typescript
// REST adapter with HTTP client dependency
const RestUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort],
  factory:
    ({ httpClient }) =>
    async (params, { signal }) => {
      const response = await httpClient.get("/api/users", {
        params: { role: params.role, page: params.page },
        signal,
      });
      return response.data;
    },
});

// GraphQL adapter
const GraphQLUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [GraphQLClientPort],
  factory:
    ({ graphql }) =>
    async (params, { signal }) => {
      const result = await graphql.query({
        query: gql`
          query Users($role: String, $page: Int) {
            users(role: $role, page: $page) {
              id
              name
              email
              role
            }
          }
        `,
        variables: params,
        context: { fetchOptions: { signal } },
      });
      return result.data.users;
    },
});

// Mock adapter for testing (no dependencies)
const MockUsersAdapter = createQueryAdapter(UsersPort, {
  factory: () => async params => {
    const users = [
      { id: "1", name: "Alice", email: "alice@example.com", role: "admin" },
      { id: "2", name: "Bob", email: "bob@example.com", role: "user" },
    ];
    if (params.role) {
      return users.filter(u => u.role === params.role);
    }
    return users;
  },
});

// Adapter with multiple dependencies
const CachedUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort, LocalStoragePort, LoggerPort],
  factory:
    ({ httpClient, localStorage, logger }) =>
    async (params, { signal }) => {
      const cacheKey = `users:${JSON.stringify(params)}`;

      // Check local storage first
      const cached = localStorage.get(cacheKey);
      if (cached) {
        logger.debug("Cache hit for users");
        return cached;
      }

      // Fetch from API
      logger.debug("Fetching users from API");
      const response = await httpClient.get("/api/users", { params, signal });

      // Store in local storage
      localStorage.set(cacheKey, response.data);

      return response.data;
    },
});
```

### 7.4 Adapter Composition

Query adapters are standard HexDI adapters and can be composed normally:

```typescript
const graph = createGraph()
  // Infrastructure
  .provide(HttpClientAdapter)
  .provide(AuthInterceptorAdapter)

  // Query adapters
  .provide(RestUsersAdapter)
  .provide(RestProductsAdapter)
  .provide(RestOrdersAdapter)

  .build();
```

---

## 8. Mutation Adapters

### 8.1 Type Definition

```typescript
interface MutationAdapter<P extends MutationPort<any, any, any, any, any>> {
  readonly _tag: "MutationAdapter";
  readonly port: P;
  readonly mutate: MutationExecutor<P>;
}

type MutationExecutor<P extends MutationPort<any, any, any, any, any>> = (
  input: InferMutationInput<P>,
  context: MutationContext
) => Promise<InferMutationData<P>>;

interface MutationContext {
  /** AbortSignal for cancellation */
  readonly signal: AbortSignal;

  /** Custom metadata */
  readonly meta?: Record<string, unknown>;
}
```

### 8.2 Factory Function

```typescript
function createMutationAdapter<
  P extends MutationPort<any, any, any, any, any>,
  Deps extends Record<string, Port<any, any>> = Record<string, never>,
>(
  port: P,
  config: {
    requires?: PortsTuple<Deps>;
    factory: (deps: ResolvedDeps<Deps>) => MutationExecutor<P>;
  }
): MutationAdapter<P>;
```

### 8.3 Examples

```typescript
// REST mutation adapter
const RestCreateUserAdapter = createMutationAdapter(CreateUserPort, {
  requires: [HttpClientPort],
  factory:
    ({ httpClient }) =>
    async (input, { signal }) => {
      const response = await httpClient.post("/api/users", input, { signal });
      return response.data;
    },
});

// Mutation with validation
const RestUpdateUserAdapter = createMutationAdapter(UpdateUserPort, {
  requires: [HttpClientPort, ValidatorPort],
  factory:
    ({ httpClient, validator }) =>
    async (input, { signal }) => {
      // Validate input before sending
      const validated = validator.validate(UpdateUserSchema, input);

      const response = await httpClient.patch(`/api/users/${validated.id}`, validated, { signal });
      return response.data;
    },
});

// Mock mutation for testing
const MockCreateUserAdapter = createMutationAdapter(CreateUserPort, {
  factory: () => async input => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
  },
});
```

---

## 9. Cache Architecture

### 9.1 Cache Key Structure

Cache keys uniquely identify query results:

```typescript
type CacheKey = readonly [portName: string, paramsHash: string];

// Key generation
function createCacheKey<P extends QueryPort<any, any, any, any>>(
  port: P,
  params: InferQueryParams<P>
): CacheKey {
  return [port.name, stableStringify(params)] as const;
}

// Examples:
// ['Users', '{"role":"admin"}']
// ['UserById', '{"id":"123"}']
// ['CurrentUser', '{}']
```

### 9.2 Cache Entry

```typescript
interface CacheEntry<TData, TError = Error> {
  /** The cached data */
  readonly data: TData | undefined;

  /** Error from last fetch attempt */
  readonly error: TError | null;

  /** Current status */
  readonly status: "pending" | "success" | "error";

  /** Timestamp when data was last updated */
  readonly dataUpdatedAt: number | undefined;

  /** Timestamp when error was last updated */
  readonly errorUpdatedAt: number | undefined;

  /** Number of times this query has been fetched */
  readonly fetchCount: number;

  /** Whether data is considered stale */
  readonly isStale: boolean;

  /** Number of active subscribers (components using this data) */
  readonly subscriberCount: number;
}
```

### 9.3 QueryCache Interface

```typescript
interface QueryCache {
  // === Read Operations ===

  /** Get cache entry for a query */
  get<P extends QueryPort<any, any, any, any>>(
    port: P,
    params: InferQueryParams<P>
  ): CacheEntry<InferQueryData<P>, InferQueryError<P>> | undefined;

  /** Check if query has data in cache */
  has<P extends QueryPort<any, any, any, any>>(port: P, params: InferQueryParams<P>): boolean;

  /** Get all cache entries */
  getAll(): ReadonlyMap<string, CacheEntry<unknown>>;

  /** Find entries matching predicate */
  find(
    predicate: (entry: CacheEntry<unknown>, key: CacheKey) => boolean
  ): ReadonlyArray<[CacheKey, CacheEntry<unknown>]>;

  // === Write Operations ===

  /** Set data for a query */
  set<P extends QueryPort<any, any, any, any>>(
    port: P,
    params: InferQueryParams<P>,
    data: InferQueryData<P>
  ): void;

  /** Set error for a query */
  setError<P extends QueryPort<any, any, any, any>>(
    port: P,
    params: InferQueryParams<P>,
    error: InferQueryError<P>
  ): void;

  /** Mark query as stale (will refetch on next access) */
  invalidate<P extends QueryPort<any, any, any, any>>(port: P, params?: InferQueryParams<P>): void;

  /** Remove query from cache entirely */
  remove<P extends QueryPort<any, any, any, any>>(port: P, params?: InferQueryParams<P>): void;

  /** Clear all entries from cache */
  clear(): void;

  // === Subscriptions ===

  /** Subscribe to cache changes */
  subscribe(listener: CacheListener): Unsubscribe;

  /** Subscribe to specific query changes */
  subscribeToQuery<P extends QueryPort<any, any, any, any>>(
    port: P,
    params: InferQueryParams<P>,
    listener: QueryListener<InferQueryData<P>, InferQueryError<P>>
  ): Unsubscribe;
}

type CacheListener = (event: CacheEvent) => void;

type CacheEvent =
  | { type: "added"; key: CacheKey; entry: CacheEntry<unknown> }
  | { type: "updated"; key: CacheKey; entry: CacheEntry<unknown> }
  | { type: "removed"; key: CacheKey }
  | { type: "invalidated"; key: CacheKey }
  | { type: "cleared" };

type QueryListener<TData, TError> = (entry: CacheEntry<TData, TError>) => void;

type Unsubscribe = () => void;
```

### 9.4 Garbage Collection

Unused cache entries are automatically cleaned up:

```typescript
interface GarbageCollectorConfig {
  /** Interval between GC runs in ms (default: 60000 / 1 minute) */
  readonly interval: number;

  /** Whether GC is enabled (default: true) */
  readonly enabled: boolean;
}

// Entry is eligible for garbage collection when:
// 1. subscriberCount === 0 (no active queries)
// 2. Date.now() - dataUpdatedAt > cacheTime
```

### 9.5 Cache Persistence (Optional)

```typescript
interface CachePersister {
  /** Save cache to storage */
  save(cache: QueryCache): Promise<void>;

  /** Restore cache from storage */
  restore(): Promise<Map<string, CacheEntry<unknown>> | undefined>;

  /** Clear persisted cache */
  clear(): Promise<void>;
}

// Example: LocalStorage persister
const localStoragePersister: CachePersister = {
  async save(cache) {
    const entries = Array.from(cache.getAll().entries());
    localStorage.setItem("query-cache", JSON.stringify(entries));
  },

  async restore() {
    const stored = localStorage.getItem("query-cache");
    if (!stored) return undefined;
    return new Map(JSON.parse(stored));
  },

  async clear() {
    localStorage.removeItem("query-cache");
  },
};
```

---

## 10. Query Lifecycle

### 10.1 Lifecycle Diagram

```
  useQuery(UsersPort, { role: 'admin' })
                │
                ▼
  ┌─────────────────────────────┐
  │ 1. GENERATE CACHE KEY       │
  │    ['Users', '{"role":"admin"}']
  └──────────────┬──────────────┘
                 │
                 ▼
  ┌─────────────────────────────┐
  │ 2. CHECK CACHE              │
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
                     existing            │ 4. RESOLVE ADAPTER          │
                                         │    container.resolve(Port)  │
                                         └──────────────┬──────────────┘
                                                        │
                                                        ▼
                                         ┌─────────────────────────────┐
                                         │ 5. EXECUTE FETCH            │
                                         │    adapter.fetch(params)    │
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
                                      • Update cache            • Retry?
                                      • Notify subscribers      • Update error
                                      • Clear from dedup        • Notify subscribers
                                      • Return data             • Clear from dedup
```

### 10.2 Refetch Triggers

| Trigger            | Condition                                      | Behavior                      |
| ------------------ | ---------------------------------------------- | ----------------------------- |
| **Mount**          | `refetchOnMount: true` AND data is stale       | Background refetch            |
| **Mount (always)** | `refetchOnMount: 'always'`                     | Always refetch                |
| **Window Focus**   | `refetchOnWindowFocus: true` AND data is stale | Background refetch            |
| **Interval**       | `refetchInterval: number`                      | Periodic refetch              |
| **Manual**         | `refetch()` called                             | Immediate refetch             |
| **Invalidation**   | `queryClient.invalidate()`                     | Mark stale, refetch if active |

### 10.3 Staleness

```typescript
function isStale<P extends QueryPort<any, any, any, any>>(
  entry: CacheEntry<InferQueryData<P>>,
  port: P,
  options?: { staleTime?: number }
): boolean {
  if (!entry.dataUpdatedAt) return true;

  const staleTime = options?.staleTime ?? port.defaults?.staleTime ?? 0;
  return Date.now() - entry.dataUpdatedAt > staleTime;
}
```

---

## 11. Query States

### 11.1 State Types

```typescript
type QueryStatus = "pending" | "success" | "error";
type FetchStatus = "idle" | "fetching";

interface QueryState<TData, TError = Error> {
  // === Status ===

  /** Overall query status */
  readonly status: QueryStatus;

  /** Current fetch status */
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

  /** True when refetching (has data, fetching new data) */
  readonly isRefetching: boolean;

  /** True when fetch is pending and no data exists */
  readonly isLoading: boolean;

  /** True when fetch succeeded and no refetch is in progress */
  readonly isStale: boolean;

  /** True when data exists (regardless of freshness) */
  readonly isPlaceholderData: boolean;

  // === Data ===

  /** The query result data */
  readonly data: TData | undefined;

  /** Error from last failed fetch */
  readonly error: TError | null;

  // === Timestamps ===

  /** When data was last updated */
  readonly dataUpdatedAt: number | undefined;

  /** When error was last updated */
  readonly errorUpdatedAt: number | undefined;

  // === Actions ===

  /** Manually refetch the query */
  readonly refetch: (options?: RefetchOptions) => Promise<TData>;
}

interface RefetchOptions {
  /** Throw on error instead of returning it */
  readonly throwOnError?: boolean;

  /** Cancel any in-flight request first */
  readonly cancelRefetch?: boolean;
}
```

### 11.2 State Transitions

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              STATE MACHINE                                    │
└──────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │      INITIAL        │
                         │  status: 'pending'  │
                         │  fetchStatus: 'idle'│
                         │  data: undefined    │
                         └──────────┬──────────┘
                                    │
                                    │ mount / enabled
                                    ▼
                         ┌─────────────────────┐
                         │     LOADING         │
                         │  status: 'pending'  │
                         │  fetchStatus:'fetch'│
                         │  data: undefined    │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
         ┌─────────────────────┐       ┌─────────────────────┐
         │      SUCCESS        │       │       ERROR         │
         │  status: 'success'  │       │  status: 'error'    │
         │  fetchStatus: 'idle'│       │  fetchStatus: 'idle'│
         │  data: TData        │       │  error: TError      │
         └──────────┬──────────┘       └──────────┬──────────┘
                    │                             │
                    │◀────────────────────────────┤
                    │         refetch()           │
                    ▼                             │
         ┌─────────────────────┐                  │
         │    REFETCHING       │                  │
         │  status: 'success'  │ ─────────────────┘
         │  fetchStatus:'fetch'│
         │  data: TData (prev) │
         └─────────────────────┘
```

### 11.3 State Derivation

```typescript
// Derived state calculations
const isPending = status === "pending";
const isSuccess = status === "success";
const isError = status === "error";
const isFetching = fetchStatus === "fetching";
const isRefetching = isFetching && !isPending;
const isLoading = isPending && isFetching;
```

---

## 12. Deduplication

### 12.1 Purpose

Deduplication prevents redundant network requests when multiple components request the same data simultaneously.

### 12.2 Implementation

```typescript
interface DedupManager {
  /** Map of cache key string -> in-flight promise */
  readonly inFlight: Map<
    string,
    {
      promise: Promise<unknown>;
      abortController: AbortController;
    }
  >;

  /** Get existing or create new request */
  getOrCreate<T>(key: CacheKey, fetcher: (signal: AbortSignal) => Promise<T>): Promise<T>;

  /** Cancel in-flight request */
  cancel(key: CacheKey): void;

  /** Cancel all in-flight requests */
  cancelAll(): void;

  /** Check if request is in-flight */
  isInFlight(key: CacheKey): boolean;
}
```

### 12.3 Behavior

```
Time ──────────────────────────────────────────────────────────────────────────▶

Component A:  useQuery(UsersPort) ─────┐
                                       │
Component B:  useQuery(UsersPort) ─────┼───▶ Single fetch() ───▶ Both receive data
                                       │
Component C:  useQuery(UsersPort) ─────┘

Without deduplication: 3 network requests
With deduplication: 1 network request
```

### 12.4 Cancellation

```typescript
// When all subscribers unmount before fetch completes
function handleUnsubscribe(key: CacheKey) {
  const entry = cache.get(key);
  if (entry && entry.subscriberCount === 0) {
    // Cancel the in-flight request
    dedupManager.cancel(key);
  }
}
```

---

## 13. Invalidation

### 13.1 Invalidation Methods

```typescript
interface InvalidationAPI {
  /** Invalidate specific query */
  invalidate<P extends QueryPort<any, any, any, any>>(port: P, params: InferQueryParams<P>): void;

  /** Invalidate all queries for a port */
  invalidateAll<P extends QueryPort<any, any, any, any>>(port: P): void;

  /** Invalidate queries matching predicate */
  invalidateMatching(
    predicate: (entry: CacheEntry<unknown>, port: QueryPort<any, any, any, any>) => boolean
  ): void;

  /** Invalidate everything */
  invalidateEverything(): void;
}
```

### 13.2 Invalidation Behavior

| Scenario                           | Behavior                                |
| ---------------------------------- | --------------------------------------- |
| Query is active (has subscribers)  | Mark stale + trigger background refetch |
| Query is inactive (no subscribers) | Mark stale only (refetch on next use)   |
| Query is currently fetching        | Cancel + restart fetch                  |

### 13.3 Automatic Invalidation

Mutations can declare which queries to invalidate:

```typescript
const CreateUserPort = createMutationPort<"CreateUser", User, CreateUserInput>({
  name: "CreateUser",
  effects: {
    invalidates: [UsersPort], // All UsersPort queries invalidated on success
  },
});

const DeleteUserPort = createMutationPort<"DeleteUser", void, { id: string }>({
  name: "DeleteUser",
  effects: {
    invalidates: [UsersPort],
    removes: [UserByIdPort], // Specific user removed from cache
  },
});
```

### 13.4 Targeted Invalidation

```typescript
// Invalidate all users queries
queryClient.invalidateAll(UsersPort);

// Invalidate specific query
queryClient.invalidate(UsersPort, { role: "admin" });

// Invalidate based on data
queryClient.invalidateMatching((entry, port) => {
  if (port.name === "UserById" && entry.data) {
    return entry.data.organizationId === "org-123";
  }
  return false;
});
```

---

## 14. Query Client

### 14.1 Interface

```typescript
interface QueryClient {
  // === Query Operations ===

  /** Execute a query (respects cache, deduplication) */
  fetch<P extends QueryPort<any, any, any, any>>(
    port: P,
    params: InferQueryParams<P>,
    options?: FetchOptions
  ): Promise<InferQueryData<P>>;

  /** Prefetch a query (populate cache without returning) */
  prefetch<P extends QueryPort<any, any, any, any>>(
    port: P,
    params: InferQueryParams<P>,
    options?: PrefetchOptions
  ): Promise<void>;

  /** Ensure query data exists (fetch if missing) */
  ensureQueryData<P extends QueryPort<any, any, any, any>>(
    port: P,
    params: InferQueryParams<P>,
    options?: EnsureOptions
  ): Promise<InferQueryData<P>>;

  // === Mutation Operations ===

  /** Execute a mutation */
  mutate<P extends MutationPort<any, any, any, any, any>>(
    port: P,
    input: InferMutationInput<P>,
    options?: MutateOptions<P>
  ): Promise<InferMutationData<P>>;

  // === Cache Operations ===

  /** Get cached data (returns undefined if not in cache) */
  getQueryData<P extends QueryPort<any, any, any, any>>(
    port: P,
    params: InferQueryParams<P>
  ): InferQueryData<P> | undefined;

  /** Set cached data directly */
  setQueryData<P extends QueryPort<any, any, any, any>>(
    port: P,
    params: InferQueryParams<P>,
    updater: InferQueryData<P> | ((old: InferQueryData<P> | undefined) => InferQueryData<P>)
  ): void;

  /** Get query state */
  getQueryState<P extends QueryPort<any, any, any, any>>(
    port: P,
    params: InferQueryParams<P>
  ): QueryState<InferQueryData<P>, InferQueryError<P>> | undefined;

  // === Invalidation ===

  /** Invalidate queries */
  invalidate<P extends QueryPort<any, any, any, any>>(
    port: P,
    params?: InferQueryParams<P>
  ): Promise<void>;

  /** Remove queries from cache */
  remove<P extends QueryPort<any, any, any, any>>(port: P, params?: InferQueryParams<P>): void;

  /** Cancel in-flight queries */
  cancel<P extends QueryPort<any, any, any, any>>(
    port: P,
    params?: InferQueryParams<P>
  ): Promise<void>;

  /** Reset query to initial state */
  reset<P extends QueryPort<any, any, any, any>>(port: P, params?: InferQueryParams<P>): void;

  // === Subscriptions ===

  /** Subscribe to query state changes */
  subscribe<P extends QueryPort<any, any, any, any>>(
    port: P,
    params: InferQueryParams<P>,
    callback: (state: QueryState<InferQueryData<P>, InferQueryError<P>>) => void
  ): Unsubscribe;

  // === Inspection ===

  /** Get the underlying cache */
  getCache(): QueryCache;

  /** Check if any queries are fetching */
  isFetching(filters?: QueryFilters): number;

  /** Check if any mutations are pending */
  isMutating(filters?: MutationFilters): number;

  // === Lifecycle ===

  /** Clear all queries and subscriptions */
  clear(): void;

  /** Pause all background operations */
  pause(): void;

  /** Resume background operations */
  resume(): void;
}
```

### 14.2 Factory Function

```typescript
function createQueryClient(config?: QueryClientConfig): QueryClient;

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
  };

  /** Logger for debugging */
  readonly logger?: Logger;

  /** Cache persister for offline support */
  readonly persister?: CachePersister;
}
```

### 14.3 QueryClient as a Port

```typescript
// QueryClient is itself a HexDI port
const QueryClientPort = createPort<"QueryClient", QueryClient>({
  name: "QueryClient",
});

// Default adapter
const QueryClientAdapter = createAdapter(QueryClientPort, {
  lifetime: "singleton",
  factory: () =>
    createQueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: 3,
        },
      },
    }),
});
```

---

## 15. HexDI Integration

### 15.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HEXDI CONTAINER                                 │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ HttpClientPort  │  │ AuthPort        │  │ LoggerPort      │             │
│  │ (infrastructure)│  │ (infrastructure)│  │ (infrastructure)│             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
│                                ▼                                            │
│                    ┌───────────────────────┐                               │
│                    │    QueryClientPort    │                               │
│                    │    (singleton)        │                               │
│                    └───────────┬───────────┘                               │
│                                │                                            │
│           ┌────────────────────┼────────────────────┐                       │
│           │                    │                    │                       │
│           ▼                    ▼                    ▼                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ UsersQueryPort  │  │ProductQueryPort │  │ OrderQueryPort  │             │
│  │ (query adapter) │  │ (query adapter) │  │ (query adapter) │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.2 Graph Composition

```typescript
// Production graph
const ProductionGraph = createGraph()
  // Infrastructure
  .provide(
    createAdapter(HttpClientPort, {
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

  // Query infrastructure
  .provide(QueryClientAdapter)

  // Query adapters
  .provide(RestUsersAdapter)
  .provide(RestProductsAdapter)
  .provide(RestOrdersAdapter)

  // Mutation adapters
  .provide(RestCreateUserAdapter)
  .provide(RestUpdateUserAdapter)
  .provide(RestDeleteUserAdapter)

  .build();

// Test graph
const TestGraph = createGraph()
  .provide(MockHttpClientAdapter)
  .provide(NoopLoggerAdapter)
  .provide(QueryClientAdapter)
  .provide(MockUsersAdapter)
  .provide(MockProductsAdapter)
  .build();
```

### 15.3 Resolution Flow

```typescript
// When useQuery(UsersPort, params) is called:

// 1. React hook gets container from HexDI context
const container = useContainer();

// 2. Resolve QueryClient (singleton, created once)
const queryClient = container.resolve(QueryClientPort);

// 3. QueryClient internally resolves the query adapter
//    This happens through the same container
const adapter = container.resolve(UsersPort);

// 4. QueryClient executes the query
const data = await queryClient.fetch(UsersPort, params);
// Internally: adapter.fetch(params, context)
```

### 15.4 Scoped Queries

With HexDI's scoped resolution, queries can have request-scoped dependencies:

```typescript
// Request-scoped auth token
const AuthTokenAdapter = createAdapter(AuthTokenPort, {
  lifetime: "scoped",
  factory: deps => deps.authService.getCurrentToken(),
  requires: [AuthServicePort],
});

// Query adapter that uses scoped token
const SecureUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort, AuthTokenPort],
  factory:
    ({ httpClient, authToken }) =>
    async (params, { signal }) => {
      const response = await httpClient.get("/api/users", {
        params,
        signal,
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return response.data;
    },
});

// Each request scope gets its own token
const scope = container.createScope();
const users = await scope.resolve(QueryClientPort).fetch(UsersPort, {});
```

---

## 16. React Integration

### 16.1 Provider Setup

```typescript
// QueryProvider must be inside HexDIProvider
function App() {
  return (
    <HexDIProvider graph={graph}>
      <QueryProvider>
        <Router />
      </QueryProvider>
    </HexDIProvider>
  );
}

// QueryProvider implementation
function QueryProvider({ children }: { children: React.ReactNode }) {
  const container = useContainer();
  const queryClient = container.resolve(QueryClientPort);

  return (
    <QueryClientContext.Provider value={queryClient}>
      {children}
    </QueryClientContext.Provider>
  );
}
```

### 16.2 useQuery Hook

```typescript
function useQuery<P extends QueryPort<any, any, any, any>>(
  port: P,
  params: InferQueryParams<P>,
  options?: UseQueryOptions<P>
): QueryState<InferQueryData<P>, InferQueryError<P>>;

interface UseQueryOptions<P extends QueryPort<any, any, any, any>> {
  /** Whether the query should execute (default: true) */
  enabled?: boolean;

  /** Time before data is considered stale */
  staleTime?: number;

  /** Time to keep unused data in cache */
  cacheTime?: number;

  /** Refetch behavior on mount */
  refetchOnMount?: boolean | "always";

  /** Refetch behavior on window focus */
  refetchOnWindowFocus?: boolean | "always";

  /** Polling interval in ms */
  refetchInterval?: number | false;

  /** Only poll when window is focused */
  refetchIntervalInBackground?: boolean;

  /** Retry configuration */
  retry?: number | boolean | ((failureCount: number, error: InferQueryError<P>) => boolean);

  /** Delay between retries */
  retryDelay?: number | ((attempt: number, error: InferQueryError<P>) => number);

  /** Transform the data before returning */
  select?: <TSelected>(data: InferQueryData<P>) => TSelected;

  /** Keep previous data while fetching new data */
  keepPreviousData?: boolean;

  /** Placeholder data while loading */
  placeholderData?: InferQueryData<P> | (() => InferQueryData<P>);

  /** Called on successful fetch */
  onSuccess?: (data: InferQueryData<P>) => void;

  /** Called on fetch error */
  onError?: (error: InferQueryError<P>) => void;

  /** Called when fetch settles (success or error) */
  onSettled?: (data: InferQueryData<P> | undefined, error: InferQueryError<P> | null) => void;

  /** Structural sharing for stable references */
  structuralSharing?: boolean;
}
```

#### Usage Examples

```typescript
// Basic usage
function UsersList() {
  const { data, isPending, error } = useQuery(UsersPort, { role: 'admin' });

  if (isPending) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {data.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// With options
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, refetch } = useQuery(
    UserByIdPort,
    { id: userId },
    {
      staleTime: 60_000,
      onSuccess: (user) => {
        analytics.track('user_profile_viewed', { userId: user.id });
      },
    },
  );

  if (isLoading) return <ProfileSkeleton />;

  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}

// Conditional query
function SearchResults({ query }: { query: string }) {
  const { data, isFetching } = useQuery(
    SearchPort,
    { query },
    { enabled: query.length >= 3 },  // Only search with 3+ chars
  );

  return (
    <div>
      {isFetching && <SearchingIndicator />}
      {data?.map(result => <SearchResult key={result.id} result={result} />)}
    </div>
  );
}

// With data transformation
function UserNames() {
  const { data: names } = useQuery(
    UsersPort,
    {},
    { select: (users) => users.map(u => u.name) },
  );

  return <TagList tags={names ?? []} />;
}
```

### 16.3 useMutation Hook

```typescript
function useMutation<P extends MutationPort<any, any, any, any, any>>(
  port: P,
  options?: UseMutationOptions<P>
): MutationResult<P>;

interface UseMutationOptions<P extends MutationPort<any, any, any, any, any>> {
  /** Called before mutation executes (for optimistic updates) */
  onMutate?: (
    input: InferMutationInput<P>
  ) => Promise<InferMutationContext<P>> | InferMutationContext<P>;

  /** Called on successful mutation */
  onSuccess?: (
    data: InferMutationData<P>,
    input: InferMutationInput<P>,
    context: InferMutationContext<P>
  ) => void;

  /** Called on mutation error */
  onError?: (
    error: InferMutationError<P>,
    input: InferMutationInput<P>,
    context: InferMutationContext<P> | undefined
  ) => void;

  /** Called when mutation settles */
  onSettled?: (
    data: InferMutationData<P> | undefined,
    error: InferMutationError<P> | null,
    input: InferMutationInput<P>,
    context: InferMutationContext<P> | undefined
  ) => void;

  /** Retry configuration */
  retry?: number | boolean;

  /** Delay between retries */
  retryDelay?: number;
}

interface MutationResult<P extends MutationPort<any, any, any, any, any>> {
  /** Current mutation status */
  status: "idle" | "pending" | "success" | "error";

  /** Derived booleans */
  isIdle: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;

  /** Result data */
  data: InferMutationData<P> | undefined;
  error: InferMutationError<P> | null;

  /** Trigger the mutation */
  mutate: (input: InferMutationInput<P>, options?: MutateOptions<P>) => void;

  /** Trigger and await the mutation */
  mutateAsync: (
    input: InferMutationInput<P>,
    options?: MutateOptions<P>
  ) => Promise<InferMutationData<P>>;

  /** Reset mutation state */
  reset: () => void;
}
```

#### Usage Examples

```typescript
// Basic mutation
function CreateUserForm() {
  const { mutate, isPending, error } = useMutation(CreateUserPort);

  const handleSubmit = (formData: CreateUserInput) => {
    mutate(formData, {
      onSuccess: (user) => {
        toast.success(`Created ${user.name}`);
        navigate(`/users/${user.id}`);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorBanner error={error} />}
      <input name="name" disabled={isPending} />
      <input name="email" disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}

// Optimistic update
function TodoItem({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();
  const { mutate } = useMutation(UpdateTodoPort, {
    onMutate: async (input) => {
      // Cancel in-flight queries
      await queryClient.cancel(TodosPort);

      // Snapshot previous value
      const previous = queryClient.getQueryData(TodosPort, {});

      // Optimistically update
      queryClient.setQueryData(TodosPort, {}, (old) =>
        old?.map(t => t.id === input.id ? { ...t, ...input } : t)
      );

      return { previous };
    },

    onError: (error, input, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(TodosPort, {}, context.previous);
      }
    },

    onSettled: () => {
      // Always refetch after
      queryClient.invalidate(TodosPort);
    },
  });

  return (
    <Checkbox
      checked={todo.completed}
      onChange={(completed) => mutate({ id: todo.id, completed })}
    />
  );
}

// Async mutation with error handling
async function handleDelete(userId: string) {
  const { mutateAsync } = useMutation(DeleteUserPort);

  try {
    await mutateAsync({ id: userId });
    toast.success('User deleted');
  } catch (error) {
    toast.error(`Failed to delete: ${error.message}`);
  }
}
```

### 16.4 useQueries Hook

Execute multiple queries in parallel:

```typescript
function useQueries<P extends QueryPort<any, any, any, any>>(
  queries: Array<{
    port: P;
    params: InferQueryParams<P>;
    options?: UseQueryOptions<P>;
  }>,
): Array<QueryState<InferQueryData<P>, InferQueryError<P>>>;

// Usage
function Dashboard({ userIds }: { userIds: string[] }) {
  const userQueries = useQueries(
    userIds.map(id => ({
      port: UserByIdPort,
      params: { id },
      options: { staleTime: 60_000 },
    }))
  );

  const isLoading = userQueries.some(q => q.isPending);
  const users = userQueries.map(q => q.data).filter(Boolean);

  if (isLoading) return <Spinner />;

  return <UserGrid users={users} />;
}
```

### 16.5 useInfiniteQuery Hook

For paginated/infinite scroll data:

```typescript
function useInfiniteQuery<P extends QueryPort<any, any, any, any>>(
  port: P,
  params: Omit<InferQueryParams<P>, 'cursor'>,
  options: UseInfiniteQueryOptions<P>,
): InfiniteQueryState<InferQueryData<P>, InferQueryError<P>>;

interface UseInfiniteQueryOptions<P extends QueryPort<any, any, any, any>> {
  /** Get the next page cursor from last page data */
  getNextPageParam: (lastPage: InferQueryData<P>) => unknown | undefined;

  /** Get the previous page cursor from first page data */
  getPreviousPageParam?: (firstPage: InferQueryData<P>) => unknown | undefined;

  /** Other query options */
  staleTime?: number;
  cacheTime?: number;
  // ...
}

interface InfiniteQueryState<TData, TError> extends QueryState<TData[], TError> {
  /** All fetched pages */
  pages: TData[];

  /** Page params for each page */
  pageParams: unknown[];

  /** Fetch the next page */
  fetchNextPage: () => Promise<void>;

  /** Fetch the previous page */
  fetchPreviousPage: () => Promise<void>;

  /** Whether there are more pages */
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  /** Whether fetching next/previous page */
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
}

// Usage
function InfiniteUserList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    UsersPort,
    { role: 'admin' },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  return (
    <div>
      {data.pages.flat().map(user => (
        <UserCard key={user.id} user={user} />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### 16.6 useSuspenseQuery Hook

For use with React Suspense:

```typescript
function useSuspenseQuery<P extends QueryPort<any, any, any, any>>(
  port: P,
  params: InferQueryParams<P>,
  options?: UseSuspenseQueryOptions<P>,
): SuspenseQueryState<InferQueryData<P>>;

// Returns data directly (suspends if loading, throws if error)
interface SuspenseQueryState<TData> {
  data: TData;  // Never undefined
  refetch: () => Promise<TData>;
}

// Usage
function UserProfile({ userId }: { userId: string }) {
  // This will suspend until data is ready
  const { data: user } = useSuspenseQuery(UserByIdPort, { id: userId });

  // data is guaranteed to exist here
  return <h1>{user.name}</h1>;
}

// Wrap with Suspense boundary
function UserProfilePage({ userId }: { userId: string }) {
  return (
    <ErrorBoundary fallback={<ErrorMessage />}>
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile userId={userId} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### 16.7 useQueryClient Hook

Access the QueryClient directly:

```typescript
function useQueryClient(): QueryClient;

// Usage
function RefreshButton() {
  const queryClient = useQueryClient();

  return (
    <button onClick={() => queryClient.invalidate(UsersPort)}>
      Refresh Users
    </button>
  );
}

function PrefetchLink({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  return (
    <Link
      to={`/users/${userId}`}
      onMouseEnter={() => {
        queryClient.prefetch(UserByIdPort, { id: userId });
      }}
    >
      View User
    </Link>
  );
}
```

### 16.8 useIsFetching Hook

Check if queries are fetching:

```typescript
function useIsFetching(filters?: QueryFilters): number;

// Usage
function GlobalLoadingIndicator() {
  const isFetching = useIsFetching();

  return isFetching > 0 ? <Spinner /> : null;
}

function UsersLoadingIndicator() {
  const isFetching = useIsFetching({ port: UsersPort });

  return isFetching > 0 ? <InlineSpinner /> : null;
}
```

---

## 17. Testing Patterns

### 17.1 Swap Adapters

The primary testing strategy is swapping adapters:

```typescript
// Production adapter
const RestUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort],
  factory: ({ httpClient }) => async (params) => {
    const res = await httpClient.get('/api/users', { params });
    return res.data;
  },
});

// Test adapter
const MockUsersAdapter = createQueryAdapter(UsersPort, {
  factory: () => async () => [
    { id: '1', name: 'Test User', role: 'admin' },
  ],
});

// Test
test('renders users', async () => {
  const testGraph = createGraph()
    .provide(QueryClientAdapter)
    .provide(MockUsersAdapter)
    .build();

  render(
    <HexDIProvider graph={testGraph}>
      <QueryProvider>
        <UsersList />
      </QueryProvider>
    </HexDIProvider>
  );

  expect(await screen.findByText('Test User')).toBeInTheDocument();
});
```

### 17.2 Test Utilities

```typescript
// packages/query/testing.ts

/** Create a test wrapper with query support */
function createQueryTestWrapper(adapters: Adapter[]) {
  const graph = createGraph()
    .provide(QueryClientAdapter)
    .provideAll(adapters)
    .build();

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <HexDIProvider graph={graph}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </HexDIProvider>
    );
  };
}

/** Create a mock query adapter with controlled responses */
function createMockQueryAdapter<P extends QueryPort<any, any, any, any>>(
  port: P,
  options?: {
    data?: InferQueryData<P>;
    error?: InferQueryError<P>;
    delay?: number;
  },
): QueryAdapter<P> {
  return createQueryAdapter(port, {
    factory: () => async () => {
      if (options?.delay) {
        await new Promise(r => setTimeout(r, options.delay));
      }
      if (options?.error) {
        throw options.error;
      }
      return options?.data as InferQueryData<P>;
    },
  });
}

/** Wait for all queries to settle */
async function waitForQueries(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
}
```

### 17.3 Testing Examples

```typescript
// Test loading state
test('shows loading spinner', () => {
  const SlowAdapter = createMockQueryAdapter(UsersPort, {
    data: [],
    delay: 1000,
  });

  const wrapper = createQueryTestWrapper([SlowAdapter]);

  render(<UsersList />, { wrapper });

  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

// Test error state
test('shows error message', async () => {
  const ErrorAdapter = createMockQueryAdapter(UsersPort, {
    error: new Error('Network error'),
  });

  const wrapper = createQueryTestWrapper([ErrorAdapter]);

  render(<UsersList />, { wrapper });

  expect(await screen.findByText('Network error')).toBeInTheDocument();
});

// Test data rendering
test('renders user list', async () => {
  const MockAdapter = createMockQueryAdapter(UsersPort, {
    data: [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ],
  });

  const wrapper = createQueryTestWrapper([MockAdapter]);

  render(<UsersList />, { wrapper });

  expect(await screen.findByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('Bob')).toBeInTheDocument();
});

// Test mutation
test('creates user and invalidates list', async () => {
  const users: User[] = [];

  const MockUsersAdapter = createQueryAdapter(UsersPort, {
    factory: () => async () => users,
  });

  const MockCreateAdapter = createMutationAdapter(CreateUserPort, {
    factory: () => async (input) => {
      const user = { id: crypto.randomUUID(), ...input };
      users.push(user);
      return user;
    },
  });

  const wrapper = createQueryTestWrapper([MockUsersAdapter, MockCreateAdapter]);

  render(<CreateUserForm />, { wrapper });

  await userEvent.type(screen.getByLabelText('Name'), 'Charlie');
  await userEvent.click(screen.getByRole('button', { name: 'Create' }));

  // After mutation, users list should be invalidated and refetched
  await waitFor(() => {
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('Charlie');
  });
});
```

### 17.4 Integration Testing

```typescript
// Test with real HTTP but mocked server
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Alice' },
    ]);
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('fetches users from API', async () => {
  // Use production graph with real HTTP adapter
  const graph = createGraph()
    .provide(HttpClientAdapter)
    .provide(QueryClientAdapter)
    .provide(RestUsersAdapter)
    .build();

  render(
    <HexDIProvider graph={graph}>
      <QueryProvider>
        <UsersList />
      </QueryProvider>
    </HexDIProvider>
  );

  expect(await screen.findByText('Alice')).toBeInTheDocument();
});
```

---

## 18. Advanced Patterns

### 18.1 Dependent Queries

```typescript
function UserPosts({ userId }: { userId: string }) {
  // First query
  const { data: user, isPending: userPending } = useQuery(
    UserByIdPort,
    { id: userId },
  );

  // Second query depends on first
  const { data: posts, isPending: postsPending } = useQuery(
    UserPostsPort,
    { userId: user?.id ?? '' },
    { enabled: !!user?.id },  // Only run when user is loaded
  );

  if (userPending) return <Spinner />;

  return (
    <div>
      <h1>{user.name}'s Posts</h1>
      {postsPending ? (
        <PostsSkeleton />
      ) : (
        <PostList posts={posts} />
      )}
    </div>
  );
}
```

### 18.2 Parallel Queries

```typescript
function Dashboard() {
  // These run in parallel
  const usersQuery = useQuery(UsersPort, {});
  const productsQuery = useQuery(ProductsPort, {});
  const ordersQuery = useQuery(OrdersPort, {});

  const isLoading = usersQuery.isPending || productsQuery.isPending || ordersQuery.isPending;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div>
      <UsersWidget users={usersQuery.data} />
      <ProductsWidget products={productsQuery.data} />
      <OrdersWidget orders={ordersQuery.data} />
    </div>
  );
}
```

### 18.3 Prefetching

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
  await queryClient.prefetch(UserByIdPort, { id: params.userId });
  return null;
}
```

### 18.4 Polling

```typescript
function LivePrices() {
  const { data } = useQuery(
    PricesPort,
    {},
    {
      refetchInterval: 5000,  // Poll every 5 seconds
      refetchIntervalInBackground: false,  // Stop when tab is hidden
    },
  );

  return <PriceTable prices={data} />;
}
```

### 18.5 Pagination

```typescript
function PaginatedUsers() {
  const [page, setPage] = useState(1);

  const { data, isPending, isFetching } = useQuery(
    UsersPort,
    { page, limit: 10 },
    { keepPreviousData: true },  // Keep showing old data while fetching new
  );

  return (
    <div>
      {/* Show loading overlay while refetching, but keep content visible */}
      <div style={{ opacity: isFetching ? 0.5 : 1 }}>
        <UserList users={data?.users ?? []} />
      </div>

      <Pagination
        page={page}
        totalPages={data?.totalPages ?? 1}
        onChange={setPage}
        disabled={isPending}
      />
    </div>
  );
}
```

### 18.6 Optimistic Updates with Rollback

```typescript
function TodoList() {
  const queryClient = useQueryClient();
  const { mutate: toggleTodo } = useMutation(ToggleTodoPort, {
    onMutate: async ({ id, completed }) => {
      // Cancel any outgoing refetches
      await queryClient.cancel(TodosPort);

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData(TodosPort, {});

      // Optimistically update
      queryClient.setQueryData(TodosPort, {}, old =>
        old?.map(todo => (todo.id === id ? { ...todo, completed } : todo))
      );

      // Return context with snapshot
      return { previousTodos };
    },

    onError: (err, variables, context) => {
      // Rollback to snapshot on error
      if (context?.previousTodos) {
        queryClient.setQueryData(TodosPort, {}, context.previousTodos);
      }
      toast.error("Failed to update todo");
    },

    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidate(TodosPort);
    },
  });

  // ...
}
```

### 18.7 Placeholder Data

```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data } = useQuery(
    UserByIdPort,
    { id: userId },
    {
      // Show placeholder while loading
      placeholderData: () => ({
        id: userId,
        name: 'Loading...',
        email: '',
        avatar: '/placeholder-avatar.png',
      }),
    },
  );

  return (
    <div>
      <img src={data.avatar} alt={data.name} />
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}
```

### 18.8 Query Composition

```typescript
// Compose multiple ports into a single hook
function useUserWithPosts(userId: string) {
  const userQuery = useQuery(UserByIdPort, { id: userId });
  const postsQuery = useQuery(UserPostsPort, { userId }, { enabled: !!userQuery.data });

  return {
    user: userQuery.data,
    posts: postsQuery.data,
    isLoading: userQuery.isPending || postsQuery.isPending,
    error: userQuery.error || postsQuery.error,
    refetch: async () => {
      await Promise.all([userQuery.refetch(), postsQuery.refetch()]);
    },
  };
}
```

### 18.9 Multi-Tenant Configuration

```typescript
// Different adapters per tenant
function createTenantGraph(tenantId: string) {
  const baseUrl = `https://${tenantId}.api.example.com`;

  return createGraph()
    .provide(createAdapter(HttpClientPort, {
      lifetime: 'singleton',
      factory: () => axios.create({ baseURL: baseUrl }),
    }))
    .provide(QueryClientAdapter)
    .provide(RestUsersAdapter)
    .build();
}

// Root app switches graphs based on tenant
function App() {
  const tenantId = useTenantId();
  const graph = useMemo(() => createTenantGraph(tenantId), [tenantId]);

  return (
    <HexDIProvider graph={graph}>
      <QueryProvider>
        <TenantApp />
      </QueryProvider>
    </HexDIProvider>
  );
}
```

---

## 19. API Reference

### 19.1 @hex-di/query Exports

```typescript
// Ports
export { createQueryPort } from "./ports/query-port";
export { createMutationPort } from "./ports/mutation-port";
export type { QueryPort, MutationPort, QueryDefaults, MutationEffects } from "./ports/types";

// Adapters
export { createQueryAdapter } from "./adapters/query-adapter";
export { createMutationAdapter } from "./adapters/mutation-adapter";
export type {
  QueryAdapter,
  MutationAdapter,
  FetchContext,
  MutationContext,
} from "./adapters/types";

// Client
export { createQueryClient } from "./client/client";
export { QueryClientPort, QueryClientAdapter } from "./client/port";
export type { QueryClient, QueryClientConfig } from "./client/types";

// Cache
export type { QueryCache, CacheEntry, CacheKey, CacheListener, CacheEvent } from "./cache/types";

// State
export type { QueryState, MutationState, QueryStatus, FetchStatus } from "./types/state";

// Type utilities
export type {
  InferQueryData,
  InferQueryParams,
  InferQueryError,
  InferQueryName,
  InferMutationData,
  InferMutationInput,
  InferMutationError,
  InferMutationContext,
} from "./types/utils";
```

### 19.2 @hex-di/query-react Exports

```typescript
// Provider
export { QueryProvider } from "./provider/query-provider";

// Hooks
export { useQuery } from "./hooks/use-query";
export { useMutation } from "./hooks/use-mutation";
export { useQueries } from "./hooks/use-queries";
export { useInfiniteQuery } from "./hooks/use-infinite-query";
export { useSuspenseQuery } from "./suspense/use-suspense-query";
export { useQueryClient } from "./hooks/use-query-client";
export { useIsFetching } from "./hooks/use-is-fetching";
export { useIsMutating } from "./hooks/use-is-mutating";

// Types
export type {
  UseQueryOptions,
  UseMutationOptions,
  UseInfiniteQueryOptions,
  UseSuspenseQueryOptions,
  QueryFilters,
  MutationFilters,
} from "./types";
```

---

## 20. Migration Guide

### 20.1 From TanStack Query

```typescript
// Before (TanStack Query)
function UsersList() {
  const { data, isLoading } = useQuery({
    queryKey: ["users", { role: "admin" }],
    queryFn: () => fetch("/api/users?role=admin").then(r => r.json()),
  });
}

// After (HexDI Query)

// 1. Define the port (once)
const UsersPort = createQueryPort<"Users", User[], { role?: string }>({
  name: "Users",
});

// 2. Define the adapter (once)
const RestUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort],
  factory:
    ({ httpClient }) =>
    async params => {
      const res = await httpClient.get("/api/users", { params });
      return res.data;
    },
});

// 3. Register in graph (once)
const graph = createGraph()
  .provide(HttpClientAdapter)
  .provide(QueryClientAdapter)
  .provide(RestUsersAdapter)
  .build();

// 4. Use in component
function UsersList() {
  const { data, isPending } = useQuery(UsersPort, { role: "admin" });
}
```

### 20.2 Key Differences

| TanStack Query                    | HexDI Query                       |
| --------------------------------- | --------------------------------- |
| `queryKey: ['users']`             | `port: UsersPort`                 |
| `queryFn: () => fetch(...)`       | Adapter registered in graph       |
| `useQuery({ queryKey, queryFn })` | `useQuery(port, params)`          |
| Mock with MSW                     | Swap adapter in graph             |
| `QueryClient` in context          | `QueryClient` resolved from HexDI |

### 20.3 Gradual Migration

HexDI Query can coexist with TanStack Query during migration:

```typescript
// Both can run side by side
function App() {
  return (
    <TanStackQueryProvider client={tanstackClient}>
      <HexDIProvider graph={graph}>
        <QueryProvider>
          <Router />
        </QueryProvider>
      </HexDIProvider>
    </TanStackQueryProvider>
  );
}

// Migrate one query at a time
function UsersList() {
  // Old: TanStack Query
  // const { data } = useTanStackQuery(['users'], fetchUsers);

  // New: HexDI Query
  const { data } = useQuery(UsersPort, {});
}
```

---

## Appendix A: Comparison with Other Libraries

| Feature                  | TanStack Query | SWR     | Apollo      | HexDI Query |
| ------------------------ | -------------- | ------- | ----------- | ----------- |
| Caching                  | ✅             | ✅      | ✅          | ✅          |
| Deduplication            | ✅             | ✅      | ✅          | ✅          |
| Background refetch       | ✅             | ✅      | ✅          | ✅          |
| Optimistic updates       | ✅             | ✅      | ✅          | ✅          |
| Suspense                 | ✅             | ✅      | ✅          | ✅          |
| DevTools                 | ✅             | ❌      | ✅          | 🔜          |
| **Port/Adapter pattern** | ❌             | ❌      | ❌          | ✅          |
| **DI integration**       | ❌             | ❌      | ❌          | ✅          |
| **Adapter swapping**     | ❌             | ❌      | ❌          | ✅          |
| **Type-safe contracts**  | Partial        | Partial | ✅ (schema) | ✅          |

---

## Appendix B: Glossary

| Term                   | Definition                                                     |
| ---------------------- | -------------------------------------------------------------- |
| **QueryPort**          | A type-safe contract declaring what data is needed             |
| **MutationPort**       | A type-safe contract declaring what operation to perform       |
| **QueryAdapter**       | An implementation of how to fetch data for a QueryPort         |
| **MutationAdapter**    | An implementation of how to perform a MutationPort operation   |
| **QueryClient**        | The central coordinator for caching and query execution        |
| **QueryCache**         | The storage layer for query results                            |
| **Stale**              | Data that has exceeded its `staleTime` and should be refetched |
| **Deduplication**      | Preventing duplicate requests for the same data                |
| **Invalidation**       | Marking cached data as stale to trigger refetch                |
| **Garbage Collection** | Automatic cleanup of unused cache entries                      |

---

## Appendix C: Design Decisions

### Why Ports for Queries?

Traditional query libraries couple components to fetch logic:

```typescript
// Component knows about URLs, HTTP methods, error handling
const { data } = useQuery(["users"], () => fetch("/api/users").then(r => r.json()));
```

With ports, components only know about contracts:

```typescript
// Component only knows it needs "Users" data
const { data } = useQuery(UsersPort, {});
```

Benefits:

1. **Testability** - Swap REST for mock without touching components
2. **Flexibility** - Change REST to GraphQL without touching components
3. **Type safety** - Ports enforce data shape at compile time
4. **Consistency** - Same DI patterns throughout application

### Why Not Just Use TanStack Query?

TanStack Query is excellent, but:

1. **No DI integration** - Fetch functions can't easily declare dependencies
2. **Testing requires mocking** - MSW or similar needed for tests
3. **Global configuration** - Harder to have per-tenant or per-test config
4. **Coupled fetch logic** - Components know about fetch implementation

HexDI Query builds on the same proven patterns (caching, deduplication, etc.) while adding hexagonal architecture benefits.

---

_End of Specification_
