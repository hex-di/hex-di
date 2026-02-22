# 03 - Query Ports

## 11. createQueryPort

The `createQueryPort` factory creates query port definitions using the curried generics pattern established throughout HexDI. Type parameters are explicit in the first call; configuration is inferred in the second call.

### Factory Signature

```typescript
function createQueryPort<TData, TParams = void, TError = Error>(): <
  const TName extends string,
  const TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
>(
  config: QueryPortConfig<TData, TParams, TError, TName, TDependsOn>
) => QueryPort<TName, TData, TParams, TError, TDependsOn>;
```

### QueryPortConfig

```typescript
interface QueryPortConfig<
  TData,
  TParams,
  TError,
  TName extends string,
  TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
> {
  /** Unique name -- becomes the cache key prefix and port identifier */
  readonly name: TName;

  /**
   * Structural data dependencies on other query ports.
   *
   * Declares that this query CANNOT execute until the listed queries have data.
   * This is a compile-time declaration -- the GraphBuilder validates that:
   * 1. All referenced ports exist in the graph
   * 2. No circular dependency chains exist (A → B → A)
   *
   * The `useQuery` hook automatically:
   * - Subscribes to dependency ports' data
   * - Defers execution until all dependencies have data
   * - Passes dependency data to the params mapper
   *
   * For dynamic/conditional dependencies that vary at runtime, use the
   * `enabled` option in useQuery instead (escape hatch).
   */
  readonly dependsOn?: TDependsOn;

  /**
   * NOTE: When `createQueryAdapter()` processes a query port, each port listed
   * in `dependsOn` is automatically added to the adapter's `requires` array.
   * This ensures the GraphBuilder validates dependency cycles and captive
   * dependency violations across query-to-query relationships.
   */

  /** Default query options (can be overridden per-use) */
  readonly defaults?: Partial<QueryDefaults>;
}
```

### Why Curried Generics

The two-stage call separates concerns:

1. **First call** -- explicit type parameters that TypeScript cannot infer: the data shape, parameter shape, and error shape
2. **Second call** -- configuration that TypeScript can infer: the name literal, defaults

```typescript
//        Stage 1: explicit types         Stage 2: inferred config
//        vvvvvvvvvvvvvvvvvvvvvvvvvvvvvv  vvvvvvvvvvvvvvvvvvvvvvvvvvvvv
const P = createQueryPort<User[], Params>()({ name: "Users", defaults: {} });
//                                       ^^
//                               curried boundary
```

This matches the pattern used by `createPort` in `@hex-di/ports`.

### Examples

```typescript
// Simple query -- no parameters
const HealthCheckPort = createQueryPort<{ status: string }>()({
  name: "HealthCheck",
  defaults: { staleTime: 10_000, cacheTime: 30_000 },
});

// Query with parameters
const UsersPort = createQueryPort<User[], { role?: string; page?: number }>()({
  name: "Users",
  defaults: { staleTime: 30_000 },
});

// Query with specific params
const UserByIdPort = createQueryPort<User, { id: string }>()({
  name: "UserById",
  defaults: { staleTime: 60_000, cacheTime: 600_000 },
});

// Query with custom error type
interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

const ProductsPort = createQueryPort<Product[], void, ApiError>()({
  name: "Products",
});

// Query with no caching (real-time data)
const LiveMetricsPort = createQueryPort<MetricsSnapshot>()({
  name: "LiveMetrics",
  defaults: { staleTime: 0, cacheTime: 0 },
});

// Query with void params (explicit)
const CurrentUserPort = createQueryPort<User, void>()({
  name: "CurrentUser",
  defaults: { staleTime: 300_000 },
});

// Query with compile-time data dependency
// UserPostsPort cannot execute until UserByIdPort has data.
// The GraphBuilder validates this dependency at compile time:
// - UserByIdPort must exist in the graph
// - No circular chains (UserPosts → UserById → UserPosts)
const UserPostsPort = createQueryPort<Post[], { authorId: string }>()({
  name: "UserPosts",
  dependsOn: [UserByIdPort],
});

// Chained dependencies: ShippingRate depends on Customer AND Order
const ShippingRatePort = createQueryPort<ShippingRate, { zip: string; weight: number }>()({
  name: "ShippingRate",
  dependsOn: [CustomerByIdPort, OrderByIdPort],
});
```

### dependsOn to Adapter requires Mapping

When `createQueryAdapter()` processes a query port, it reads the port's `config.dependsOn` array and adds each dependency port to the adapter's `requires` array. This bridges the query-level data dependency declaration into the standard HexDI adapter dependency graph, enabling the `GraphBuilder` to validate:

1. **Cycle detection** -- circular query-to-query dependencies (A depends on B depends on A) are caught at compile time via `IsReachable<>`
2. **Captive dependency violations** -- a singleton query adapter depending on a scoped query port is flagged
3. **Missing ports** -- a `dependsOn` reference to a port with no adapter in the graph produces a compile-time error

```typescript
// Given a port with dependsOn:
const UserPostsPort = createQueryPort<Post[], { authorId: string }>()({
  name: "UserPosts",
  dependsOn: [UserByIdPort],
});

// createQueryAdapter translates dependsOn into requires:
const UserPostsAdapter = createQueryAdapter(UserPostsPort, {
  fetcher: fetchUserPosts,
  // Internally, the adapter's requires includes UserByIdPort
  // (in addition to any explicitly listed requires).
});

// Equivalent to manually writing:
// requires: [UserByIdPort]
// but derived automatically from the port's dependsOn declaration.
```

The mapping is additive: if the adapter config also specifies explicit `requires` (e.g., for infrastructure ports like `HttpClientPort`), the `dependsOn` ports are merged into the final `requires` array alongside them.

### Port is the Key

The port's `name` property becomes the first element of the cache key. Combined with serialized params, it produces a deterministic key:

```typescript
const UsersPort = createQueryPort<User[], { role?: string }>()({
  name: "Users",
});

// Cache key for { role: "admin" } → ["Users", '{"role":"admin"}']
// Cache key for {}                → ["Users", '{}']
// Cache key for { role: "user" }  → ["Users", '{"role":"user"}']
```

No string-based query keys. No key factories. The port IS the key.

## 12. QueryPort Type Definition

A `QueryPort` is a `DirectedPort<QueryFetcher<TData, TParams, TError>, TName, "inbound">` with phantom types for type-safe data extraction. The port carries the fetcher function type directly -- no wrapper object.

**Port Direction:** `QueryPort` uses `"inbound"` direction. The application (domain layer) calls the fetcher to receive data -- the data flows inward from infrastructure to domain. This contrasts with `SagaPort`/`SagaManagementPort` which use `"outbound"` direction, and `FlowPort` which intentionally omits direction (bidirectional: events in, state out).

### Type Definition

```typescript
/**
 * Unique symbols for phantom type branding.
 *
 * TData, TParams, and TError are all encoded in the DirectedPort base via the
 * QueryFetcher<TData, TParams, TError> function signature. Since TError is now
 * structural in the fetcher return type (it appears in ResultAsync<TData, TError>),
 * the phantom brand is redundant for type safety but retained for backward
 * inference utility compatibility -- InferQueryError extracts TError from the
 * phantom slot without needing to unwrap ResultAsync, keeping inference types
 * simple and consistent with the rest of the codebase.
 */
declare const __queryErrorType: unique symbol;
declare const QueryPortSymbol: unique symbol;

interface QueryPort<
  TName extends string = string,
  TData = unknown,
  TParams = void,
  TError = Error,
  TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
> extends DirectedPort<QueryFetcher<TData, TParams, TError>, TName, "inbound"> {
  /**
   * Phantom: compile-time error type.
   * TData, TParams, and TError are all recoverable from the DirectedPort base's
   * QueryFetcher function signature (TError via ResultAsync<TData, TError>).
   * This phantom slot is retained for backward inference utility compatibility --
   * InferQueryError extracts TError directly without unwrapping ResultAsync.
   */
  readonly [__queryErrorType]: TError;

  /** Runtime brand: identifies this as a QueryPort */
  readonly [QueryPortSymbol]: true;

  /** Query-specific configuration (carries dependsOn for compile-time graph analysis) */
  readonly config: QueryPortConfig<TData, TParams, TError, TName, TDependsOn>;
}

/** Convenience alias for query ports with erased type parameters */
type AnyQueryPort = QueryPort<string, unknown, unknown, unknown>;
```

### QueryFetcher

The service type for query ports. A query adapter's factory returns this function type directly:

```typescript
type QueryFetcher<TData, TParams, TError> = (
  params: TParams,
  context: FetchContext
) => ResultAsync<TData, TError>;
```

### Relationship to DirectedPort

```typescript
// QueryPort IS a DirectedPort, not a wrapper around one
type AssertQueryIsDirected =
  QueryPort<"Users", User[], void, Error> extends DirectedPort<
    QueryFetcher<User[], void, Error>,
    "Users",
    "inbound"
  >
    ? true
    : never;

// This means query ports participate in GraphBuilder validation
const graph = GraphBuilder.create()
  .provide(RestUsersAdapter) // Provides UsersPort
  .build();
// If RestUsersAdapter is missing, TypeScript reports a compile-time error
```

### Type Guard

```typescript
function isQueryPort(value: unknown): value is QueryPort {
  return (
    typeof value === "object" &&
    value !== null &&
    QueryPortSymbol in value &&
    value[QueryPortSymbol] === true
  );
}
```

## 13. Query Defaults

Default configuration values for queries. These are specified at the port level and can be overridden per-use in hooks or fetch calls.

### QueryDefaults

```typescript
interface QueryDefaults {
  /** Time before data is considered stale (ms). Default: 0 */
  readonly staleTime: number;

  /** Time to keep unused data in cache after last observer detaches (ms). Default: 300_000 (5 min) */
  readonly cacheTime: number;

  /** Number of retry attempts on failure. Default: 3 */
  readonly retry: number | boolean | ((failureCount: number, error: unknown) => boolean);

  /** Delay between retries. Default: exponential backoff */
  readonly retryDelay: number | ((attempt: number, error: unknown) => number);

  /** Refetch on component mount. Default: true */
  readonly refetchOnMount: boolean | "always";

  /** Refetch on window focus. Default: true */
  readonly refetchOnWindowFocus: boolean | "always";

  /** Refetch on network reconnect. Default: true */
  readonly refetchOnReconnect: boolean | "always";

  /** Auto-refetch interval (ms). Default: false (disabled) */
  readonly refetchInterval: number | false;

  /** Continue polling when window is not focused. Default: false */
  readonly refetchIntervalInBackground: boolean;

  /** Network mode. Default: "online" */
  readonly networkMode: "online" | "always" | "offlineFirst";

  /** Structural sharing for stable references. Default: true */
  readonly structuralSharing: boolean;
}
```

> **Note on typed error callbacks:** `QueryDefaults` at the global level stays non-generic --
> `retry` and `retryDelay` callbacks receive `unknown` for the error parameter because the
> global context has no `TError` in scope. On `QueryPortConfig<TData, TParams, TError, ...>`,
> where `TError` is known, the callbacks are typed:
>
> ```typescript
> interface QueryPortConfig<TData, TParams, TError, TName, TDependsOn> {
>   readonly defaults?: Partial<{
>     // ...other fields identical to QueryDefaults...
>     readonly retry: number | boolean | ((failureCount: number, error: TError) => boolean);
>     readonly retryDelay: number | ((attempt: number, error: TError) => number);
>   }>;
> }
> ```
>
> This means port-level retry logic can discriminate on `error._tag` or other structural
> properties of `TError` without type narrowing.

### Default Values

| Property                      | Default           | Description                                   |
| ----------------------------- | ----------------- | --------------------------------------------- |
| `staleTime`                   | `0`               | Data is immediately stale after fetch         |
| `cacheTime`                   | `300_000` (5 min) | Unused cache entries removed after 5 minutes  |
| `retry`                       | `3`               | Retry failed fetches up to 3 times            |
| `retryDelay`                  | exponential       | `min(1000 * 2^attempt, 30000)`                |
| `refetchOnMount`              | `true`            | Refetch stale data when a new observer mounts |
| `refetchOnWindowFocus`        | `true`            | Refetch stale data when window regains focus  |
| `refetchOnReconnect`          | `true`            | Refetch stale data when network reconnects    |
| `refetchInterval`             | `false`           | No polling                                    |
| `refetchIntervalInBackground` | `false`           | Pause polling when window loses focus         |
| `networkMode`                 | `"online"`        | Only fetch when online                        |
| `structuralSharing`           | `true`            | Use `replaceEqualDeep` for stable references  |

### Resolution Order

When determining the effective value of a query default, the system resolves in this order (first wins):

```
1. Per-use options        (useQuery(port, params, { staleTime: 10_000 }))
2. Port defaults          (createQueryPort<...>()({ defaults: { staleTime: 30_000 } }))
3. QueryClient defaults   (createQueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }))
4. Global defaults        (hardcoded defaults above)
```

### Example

```typescript
// Port level: staleTime = 30s, cacheTime = 10m
const UsersPort = createQueryPort<User[], { role?: string }>()({
  name: "Users",
  defaults: {
    staleTime: 30_000,
    cacheTime: 600_000,
    refetchOnWindowFocus: "always",
  },
});

// Hook level: override staleTime to 60s for this specific usage
const { data } = useQuery(
  UsersPort,
  { role: "admin" },
  {
    staleTime: 60_000,
  }
);
```

## 14. Type Inference Utilities

Utility types extract phantom type information from query ports using conditional types on the branded symbols.

### Inference Types

Following the established `InferenceError` pattern from `@hex-di/core`, all inference utilities return structured branded error types instead of `never` when given a non-QueryPort input. This produces actionable IDE tooltips with source, message, and the problematic input type -- rather than silent `never` failures.

```typescript
/**
 * Extract the data type from a QueryPort.
 * Uses [T] extends [...] tuple wrapping to prevent conditional type distribution
 * over union types (same pattern as IsRootContainer in @hex-di/runtime).
 *
 * Returns InferenceError on invalid input (same pattern as DebugInferAdapterProvides
 * in @hex-di/core).
 */
type InferQueryData<T> = [T] extends [QueryPort<string, infer TData, unknown, unknown>]
  ? TData
  : InferenceError<
      "InferQueryData",
      "Expected a QueryPort type. Use InferQueryData<typeof YourPort>.",
      T
    >;

/** Extract the params type from a QueryPort */
type InferQueryParams<T> = [T] extends [QueryPort<string, unknown, infer TParams, unknown>]
  ? TParams
  : InferenceError<
      "InferQueryParams",
      "Expected a QueryPort type. Use InferQueryParams<typeof YourPort>.",
      T
    >;

/** Extract the error type from a QueryPort */
type InferQueryError<T> = [T] extends [QueryPort<string, unknown, unknown, infer TError>]
  ? TError
  : InferenceError<
      "InferQueryError",
      "Expected a QueryPort type. Use InferQueryError<typeof YourPort>.",
      T
    >;

/** Extract the name literal type from a QueryPort */
type InferQueryName<T> = [T] extends [QueryPort<infer TName, unknown, unknown, unknown>]
  ? TName
  : InferenceError<
      "InferQueryName",
      "Expected a QueryPort type. Use InferQueryName<typeof YourPort>.",
      T
    >;

/** Extract the dependsOn tuple from a QueryPort */
type InferQueryDependsOn<T> = [T] extends [
  QueryPort<string, unknown, unknown, unknown, infer TDeps>,
]
  ? TDeps
  : InferenceError<
      "InferQueryDependsOn",
      "Expected a QueryPort type. Use InferQueryDependsOn<typeof YourPort>.",
      T
    >;

/** Extract dependency port names as a union */
type InferQueryDependencyNames<T> = [T] extends [
  QueryPort<string, unknown, unknown, unknown, infer TDeps>,
]
  ? TDeps extends ReadonlyArray<QueryPort<infer TName, unknown, unknown, unknown>>
    ? TName
    : never
  : InferenceError<"InferQueryDependencyNames", "Expected a QueryPort type.", T>;

/** Extract all types from a QueryPort at once */
type InferQueryTypes<T> = [T] extends [
  QueryPort<infer TName, infer TData, infer TParams, infer TError, infer TDependsOn>,
]
  ? {
      readonly name: TName;
      readonly data: TData;
      readonly params: TParams;
      readonly error: TError;
      readonly dependsOn: TDependsOn;
    }
  : InferenceError<
      "InferQueryTypes",
      "Expected a QueryPort type. Use InferQueryTypes<typeof YourPort>.",
      T
    >;
```

### Usage

```typescript
const UsersPort = createQueryPort<User[], { role?: string }>()({
  name: "Users",
});

// Individual inference
type Data = InferQueryData<typeof UsersPort>; // User[]
type Params = InferQueryParams<typeof UsersPort>; // { role?: string }
type Error = InferQueryError<typeof UsersPort>; // Error (default)
type Name = InferQueryName<typeof UsersPort>; // "Users"

// Combined inference
type Types = InferQueryTypes<typeof UsersPort>;
// {
//   readonly name: "Users";
//   readonly data: User[];
//   readonly params: { role?: string };
//   readonly error: Error;
// }
```

### Compile-Time Dependency Validation

When a query adapter is registered in a `GraphBuilder`, the `dependsOn` declaration
is extracted and fed into the same cycle detection infrastructure used for adapter
dependencies (`IsReachable<TDepGraph, ...>`).

```typescript
/**
 * Validates that all ports in `dependsOn` exist in the graph AND that
 * no circular dependency chains exist.
 *
 * This type is evaluated at GraphBuilder.provide() time. It extracts
 * dependency port names from TDependsOn and adds edges to the
 * BuilderInternals.TDepGraph, then runs IsReachable<> to detect cycles.
 */
type ValidateQueryDependencies<
  TDependsOn extends ReadonlyArray<AnyQueryPort>,
  TGraphProvides,
  TDepGraph,
  TPortName extends string,
> =
  // Step 1: Check all dependency ports exist in the graph
  ExtractPortNames<TDependsOn> extends infer TDepNames extends string
    ? [TDepNames] extends [TGraphProvides]
      ? // Step 2: Check for cycles using existing IsReachable<> infrastructure
        IsReachable<AddEdge<TDepGraph, TPortName, TDepNames>, TDepNames, TPortName> extends true
        ? `ERROR: Circular query dependency detected. "${TPortName}" depends on a query that transitively depends back on "${TPortName}". Break the cycle by removing one dependsOn declaration or using the "enabled" option for the dynamic leg.`
        : TDependsOn // Valid
      : FindMissingPorts<TDepNames, TGraphProvides> extends infer TMissing extends string
        ? `ERROR: Query "${TPortName}" dependsOn references port "${TMissing}" which is not provided in the graph. Register an adapter for "${TMissing}" or remove it from dependsOn.`
        : `ERROR: Query "${TPortName}" dependsOn references a port not provided in the graph.`
    : TDependsOn;

/** Helper: finds which port names from TNames are not in TProvides */
type FindMissingPorts<TNames extends string, TProvides> = TNames extends TProvides ? never : TNames;
```

This produces compile-time errors like:

```typescript
// COMPILE ERROR: Circular query dependency detected.
// "UserPosts" depends on a query that transitively depends back on "UserPosts".
const UserByIdPort = createQueryPort<User, { id: string }>()({
  name: "UserById",
  dependsOn: [UserPostsPort], // UserPosts depends on UserById!
});

const UserPostsPort = createQueryPort<Post[], { authorId: string }>()({
  name: "UserPosts",
  dependsOn: [UserByIdPort], // Cycle: UserPosts → UserById → UserPosts
});
```

### Conditional Helpers

```typescript
/** True if query port has non-void params (uses distribution prevention) */
type HasParams<T> = [InferQueryParams<T>] extends [void] ? false : true;

/** Build a fetch signature based on whether params are required */
type FetchSignature<T> =
  HasParams<T> extends true
    ? (
        port: T,
        params: InferQueryParams<T>
      ) => ResultAsync<InferQueryData<T>, InferQueryError<T> | QueryResolutionError>
    : (port: T) => ResultAsync<InferQueryData<T>, InferQueryError<T> | QueryResolutionError>;
```

---

_Previous: [02 - Core Concepts](./02-core-concepts.md)_

_Next: [04 - Mutation Ports](./04-mutation-ports.md)_
