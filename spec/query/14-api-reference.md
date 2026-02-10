# 14 - API Reference

Consolidated type signatures for the entire `@hex-di/query` surface area. See individual spec files for detailed explanations and examples.

## 69. Port Factories

### createQueryPort

```typescript
function createQueryPort<TData, TParams = void, TError = Error>(): <
  const TName extends string,
  const TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
>(
  config: QueryPortConfig<TData, TParams, TError, TName, TDependsOn>
) => QueryPort<TName, TData, TParams, TError, TDependsOn>;

interface QueryPortConfig<
  TData,
  TParams,
  TError,
  TName extends string,
  TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
> {
  readonly name: TName;
  readonly dependsOn?: TDependsOn;
  readonly defaults?: Partial<QueryDefaults>;
}
```

_Defined in: [03 - Query Ports](./03-query-ports.md#11-createqueryport)_

### createMutationPort

```typescript
function createMutationPort<TData, TInput = void, TError = Error, TContext = unknown>(): <
  const TName extends string,
>(
  config: MutationPortConfig<TData, TInput, TError, TContext, TName>
) => MutationPort<TName, TData, TInput, TError, TContext>;

interface MutationPortConfig<TData, TInput, TError, TContext, TName extends string> {
  readonly name: TName;
  readonly effects?: MutationEffects;
  readonly defaults?: Partial<MutationDefaults>;
}

interface MutationEffects {
  readonly invalidates?: ReadonlyArray<AnyQueryPort>;
  readonly removes?: ReadonlyArray<AnyQueryPort>;
}
```

_Defined in: [04 - Mutation Ports](./04-mutation-ports.md#15-createmutationport)_

## 70. Adapter Factories

### createQueryAdapter

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

type QueryFetcher<TData, TParams, TError> = (
  params: TParams,
  context: FetchContext
) => ResultAsync<TData, TError>;
```

_Defined in: [05 - Query Adapters](./05-query-adapters.md#19-createqueryadapter)_

### createMutationAdapter

```typescript
function createMutationAdapter<
  TData,
  TInput,
  TError,
  TContext,
  const TName extends string,
  const TRequires extends ReadonlyArray<Port<unknown, string>> = [],
>(
  port: MutationPort<TName, TData, TInput, TError, TContext>,
  config: {
    readonly requires?: TRequires;
    readonly lifetime?: Lifetime;
    readonly factory: (
      deps: ResolvedDeps<TupleToUnion<TRequires>>
    ) => MutationExecutor<TData, TInput, TError>;
  }
): Adapter<
  MutationPort<TName, TData, TInput, TError, TContext>,
  TupleToUnion<TRequires>,
  typeof config.lifetime extends string ? typeof config.lifetime : "singleton",
  "async"
>;

type MutationExecutor<TData, TInput, TError> = (
  input: TInput,
  context: MutationContext
) => ResultAsync<TData, TError>;
```

_Defined in: [06 - Mutation Adapters](./06-mutation-adapters.md#23-createmutationadapter)_

### createStreamedQueryAdapter

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
) => {
  stream: AsyncIterable<TChunk>;
  reducer: (acc: TData, chunk: TChunk) => TData;
  initialValue: TData;
  refetchMode?: "reset" | "append" | "replace";
};
```

_Defined in: [05 - Query Adapters](./05-query-adapters.md#22-streamed-queries)_

## 71. Client Interfaces

### QueryClient

```typescript
interface QueryClient {
  // Query operations
  fetch<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: FetchOptions
  ): ResultAsync<TData, TError | QueryResolutionError>;

  prefetch<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: PrefetchOptions
  ): ResultAsync<void, TError | QueryResolutionError>;

  ensureQueryData<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: EnsureOptions
  ): ResultAsync<TData, TError | QueryResolutionError>;

  // Mutation operations
  mutate<TData, TInput, TError, TContext, TName extends string>(
    port: MutationPort<TName, TData, TInput, TError, TContext>,
    input: TInput,
    options?: MutateOptions<TData, TInput, TError, TContext>
  ): ResultAsync<TData, TError | QueryResolutionError>;

  // Cache read
  getQueryData<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): TData | undefined;

  getQueryState<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): QueryState<TData, TError> | undefined;

  // Cache write
  setQueryData<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    updater: TData | ((prev: TData | undefined) => TData)
  ): void;

  // Invalidation
  invalidate<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): Promise<void>;

  invalidateMatching(
    predicate: (entry: CacheEntry<unknown, unknown>, key: CacheKey) => boolean
  ): Promise<void>;

  invalidateAll(): Promise<void>;

  // Removal
  remove<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;

  // Cancellation
  cancel<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): Promise<void>;

  cancelAll(): Promise<void>;

  // Reset
  reset<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;

  // Reactive access
  getReactiveEntry<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): ReactiveCacheEntry<TData, TError> | undefined;

  createEffect(fn: () => void): ReactiveEffect;

  getReactiveSystem(): ReactiveSystemInstance;

  // Inspection
  getCache(): QueryCache;
  isFetching(filters?: QueryFilters): number;
  isMutating(filters?: MutationFilters): number;

  // Scoping
  createChild(scope: Scope): QueryClient;

  // Lifecycle
  clear(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}
```

_Defined in: [09 - Query Client](./09-query-client.md#39-queryclient-interface)_

### createQueryClient

```typescript
function createQueryClient(container: Container, config?: QueryClientConfig): QueryClient;

interface QueryClientConfig {
  readonly defaultOptions?: {
    readonly queries?: QueryDefaults;
    readonly mutations?: MutationDefaults;
  };
  readonly cache?: {
    readonly maxSize?: number;
    readonly gcInterval?: number;
    readonly gcEnabled?: boolean;
  };
  readonly onlineManager?: OnlineManager;
  readonly focusManager?: FocusManager;
  readonly persister?: CachePersister;
  readonly maxInvalidationDepth?: number;
  readonly clock?: { readonly now: () => number };
  readonly reactiveSystem?: ReactiveSystemInstance;
}
```

_Defined in: [09 - Query Client](./09-query-client.md#40-queryclient-factory)_

### QueryResolutionError

```typescript
type QueryResolutionError =
  | {
      readonly _tag: "QueryFetchFailed";
      readonly portName: string;
      readonly params: unknown;
      readonly retryAttempt: number;
      readonly cause: unknown;
    }
  | { readonly _tag: "QueryCancelled"; readonly portName: string; readonly params: unknown }
  | {
      readonly _tag: "QueryTimeout";
      readonly portName: string;
      readonly params: unknown;
      readonly timeoutMs: number;
    }
  | { readonly _tag: "QueryAdapterMissing"; readonly portName: string }
  | {
      readonly _tag: "QueryInvalidationCycle";
      readonly chain: readonly string[];
      readonly depth: number;
    }
  | { readonly _tag: "QueryDisposed"; readonly portName: string };
```

_Defined in: [09 - Query Client](./09-query-client.md#44b-queryresolutionerror)_

### Compile-Time Error Types (Template Literals)

All compile-time validation errors use template literal types that include the specific
port names, adapter names, and constraint violations for actionable IDE diagnostics:

```typescript
// Query dependency cycle (from ValidateQueryDependencies)
`ERROR: Circular query dependency detected. "${TPortName}" depends on a query that transitively depends back on "${TPortName}".`
// Query dependency missing port (from ValidateQueryDependencies + FindMissingPorts)
`ERROR: Query "${TPortName}" dependsOn references port "${TMissing}" which is not provided in the graph.`
// Mutation invalidates missing port (from ValidateInvalidates)
`ERROR: Mutation "${TMutationName}" invalidates port "${TMissing}" which is not provided in the graph.`
// Mutation removes missing port (from ValidateRemoves)
`ERROR: Mutation "${TMutationName}" removes port "${TMissing}" which is not provided in the graph.`
// Captive dependency on query adapter (from ValidateQueryAdapterLifetime)
`ERROR: Captive dependency in query adapter "${TAdapterName}". A ${TAdapterLifetime} adapter cannot depend on ${TDepLifetime} port "${TDepName}".`;
```

_Defined in: [03 - Query Ports](./03-query-ports.md#14-type-inference-utilities), [04 - Mutation Ports](./04-mutation-ports.md#17-mutation-effects), [10 - Integration](./10-integration.md#48d-captive-dependency-rules-for-query-adapters)_

## 71b. Reactivity Module

### Signal

```typescript
interface Signal<T> {
  get(): T;
  set(value: T): void;
  peek(): T;
}

function createSignal<T>(initial: T, system?: ReactiveSystemInstance): Signal<T>;
```

### Computed

```typescript
interface Computed<T> {
  get(): T;
  peek(): T;
}

function createComputed<T>(fn: () => T, system?: ReactiveSystemInstance): Computed<T>;
```

### ReactiveEffect

```typescript
interface ReactiveEffect {
  run(): void;
  dispose(): void;
}

function createEffect(fn: () => void, system?: ReactiveSystemInstance): ReactiveEffect;
```

### ReactiveSystemInstance

```typescript
interface ReactiveSystemInstance {
  signal<T>(initialValue: T): { (): T; (value: T): void };
  computed<T>(getter: (previousValue?: T) => T): () => T;
  effect(fn: () => void): () => void;
  startBatch(): void;
  endBatch(): void;
  getActiveSub(): ReactiveNode | undefined;
  setActiveSub(sub?: ReactiveNode): ReactiveNode | undefined;
}

function createIsolatedReactiveSystem(): ReactiveSystemInstance;
```

### Batching

```typescript
function batch(
  containerOrScope: object | null,
  fn: () => void,
  system?: ReactiveSystemInstance
): Result<void, BatchExecutionFailed>;

function isInBatch(target: object): boolean;
function getBatchDepth(target: object): number;
```

_Mirrored from: `@hex-di/store` reactivity module_

## 72. Cache Interfaces

### QueryCache

```typescript
interface QueryCache {
  // Reactive access
  getEntry<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): ReactiveCacheEntry<TData, TError> | undefined;

  getOrCreateEntry<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): ReactiveCacheEntry<TData, TError>;

  // Snapshot access
  getSnapshot<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): CacheEntrySnapshot<TData, TError> | undefined;

  has<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): boolean;

  getAll(): ReadonlyMap<string, CacheEntrySnapshot<unknown, unknown>>;

  findByPort<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>
  ): ReadonlyArray<[CacheKey, CacheEntrySnapshot<TData, TError>]>;

  // Write operations
  set<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    data: TData
  ): void;

  setError<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    error: TError
  ): void;

  invalidate<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;

  remove<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;

  clear(): void;

  readonly size: number;
}

declare const __cacheKeyBrand: unique symbol;
type CacheKey<TName extends string = string> = readonly [portName: TName, paramsHash: string] & {
  readonly [__cacheKeyBrand]: true;
};
```

_Defined in: [07 - Cache Architecture](./07-cache.md#28-querycache-interface)_

### ReactiveCacheEntry

```typescript
interface ReactiveCacheEntry<TData, TError = Error> {
  // Source signals
  readonly result$: Signal<Result<TData, TError> | undefined>;
  readonly fetchStatus$: Signal<FetchStatus>;
  readonly fetchCount$: Signal<number>;
  readonly isInvalidated$: Signal<boolean>;
  readonly dataUpdatedAt$: Signal<number | undefined>;
  readonly errorUpdatedAt$: Signal<number | undefined>;

  // Derived computeds
  readonly status: Computed<QueryStatus>;
  readonly data: Computed<TData | undefined>;
  readonly error: Computed<TError | null>;
  readonly isPending: Computed<boolean>;
  readonly isSuccess: Computed<boolean>;
  readonly isError: Computed<boolean>;
  readonly isFetching: Computed<boolean>;
  readonly isLoading: Computed<boolean>;
  readonly isRefetching: Computed<boolean>;
}

type QueryStatus = "pending" | "error" | "success";
type FetchStatus = "idle" | "fetching";
```

### CacheEntrySnapshot (Non-Reactive)

```typescript
interface CacheEntrySnapshot<TData, TError = Error> {
  readonly result: Result<TData, TError> | undefined;
  readonly data: TData | undefined;
  readonly error: TError | null;
  readonly status: QueryStatus;
  readonly fetchStatus: FetchStatus;
  readonly dataUpdatedAt: number | undefined;
  readonly errorUpdatedAt: number | undefined;
  readonly fetchCount: number;
  readonly isInvalidated: boolean;
}
```

_Defined in: [07 - Cache Architecture](./07-cache.md#27-cache-entry-signal-backed)_

## 73. State Types

### QueryState

```typescript
interface QueryState<TData, TError> {
  readonly status: QueryStatus;
  readonly fetchStatus: FetchStatus;
  readonly result: Result<TData, TError> | undefined;
  readonly data: TData | undefined;
  readonly error: TError | null;
  readonly dataUpdatedAt: number | undefined;
  readonly errorUpdatedAt: number | undefined;
  readonly isInvalidated: boolean;

  // Derived booleans
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly isSuccess: boolean;
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly isRefetching: boolean;
  readonly isPaused: boolean;
  readonly isStale: boolean;
  readonly isPlaceholderData: boolean;

  // Actions
  readonly refetch: () => ResultAsync<TData, TError | QueryResolutionError>;
}
```

_Defined in: [08 - Query Lifecycle](./08-lifecycle.md#33-query-states)_

### MutationResult

```typescript
interface MutationResult<TData, TInput, TError, TContext> {
  readonly status: "idle" | "pending" | "success" | "error";
  readonly isIdle: boolean;
  readonly isPending: boolean;
  readonly isSuccess: boolean;
  readonly isError: boolean;
  readonly result: Result<TData, TError> | undefined;
  readonly data: TData | undefined;
  readonly error: TError | null;
  readonly variables: TInput | undefined;
  readonly context: TContext | undefined;
  readonly mutate: (
    input: TInput,
    options?: MutateCallbacks<TData, TInput, TError, TContext>
  ) => void;
  readonly mutateAsync: (
    input: TInput,
    options?: MutateCallbacks<TData, TInput, TError, TContext>
  ) => ResultAsync<TData, TError>;
  readonly reset: () => void;
}
```

_Defined in: [11 - React Integration](./11-react-integration.md#51-usemutation)_

### InfiniteQueryState

```typescript
interface InfiniteQueryState<TData, TError> extends QueryState<InfiniteData<TData>, TError> {
  readonly pages: readonly TData[];
  readonly pageParams: readonly unknown[];
  readonly fetchNextPage: () => ResultAsync<void, TError | QueryResolutionError>;
  readonly fetchPreviousPage: () => ResultAsync<void, TError | QueryResolutionError>;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly isFetchingPreviousPage: boolean;
}

interface InfiniteData<TData> {
  readonly pages: readonly TData[];
  readonly pageParams: readonly unknown[];
}
```

_Defined in: [11 - React Integration](./11-react-integration.md#53-useinfinitequery)_

### SuspenseQueryState

```typescript
interface SuspenseQueryState<TData, TError> {
  readonly data: TData;
  readonly refetch: () => ResultAsync<TData, TError | QueryResolutionError>;
  readonly dataUpdatedAt: number;
  readonly isRefetching: boolean;
}
```

_Defined in: [11 - React Integration](./11-react-integration.md#54-usesuspensequery)_

## 74. Type Utilities

### Query Type Inference

Uses `[T] extends [...]` distribution prevention and `NotAQueryPortError<T>` descriptive errors:

```typescript
type NotAQueryPortError<T> =
  `ERROR: Expected a QueryPort type, received ${T extends string ? T : "unknown type"}.`;

type InferQueryData<T> = [T] extends [QueryPort<string, infer D, unknown, unknown>]
  ? D
  : NotAQueryPortError<T>;
type InferQueryParams<T> = [T] extends [QueryPort<string, unknown, infer P, unknown>]
  ? P
  : NotAQueryPortError<T>;
type InferQueryError<T> = [T] extends [QueryPort<string, unknown, unknown, infer E>]
  ? E
  : NotAQueryPortError<T>;
type InferQueryName<T> = [T] extends [QueryPort<infer N, unknown, unknown, unknown>]
  ? N
  : NotAQueryPortError<T>;

type InferQueryDependsOn<T> = [T] extends [
  QueryPort<string, unknown, unknown, unknown, infer TDeps>,
]
  ? TDeps
  : NotAQueryPortError<T>;

type InferQueryDependencyNames<T> = [T] extends [
  QueryPort<string, unknown, unknown, unknown, infer TDeps>,
]
  ? TDeps extends ReadonlyArray<QueryPort<infer TName, unknown, unknown, unknown>>
    ? TName
    : never
  : NotAQueryPortError<T>;

type InferQueryTypes<T> = [T] extends [QueryPort<infer N, infer D, infer P, infer E, infer TDeps>]
  ? {
      readonly name: N;
      readonly data: D;
      readonly params: P;
      readonly error: E;
      readonly dependsOn: TDeps;
    }
  : NotAQueryPortError<T>;
```

_Defined in: [03 - Query Ports](./03-query-ports.md#14-type-inference-utilities)_

### Mutation Type Inference

Uses `[T] extends [...]` distribution prevention and `NotAMutationPortError<T>` descriptive errors:

```typescript
type NotAMutationPortError<T> =
  `ERROR: Expected a MutationPort type, received ${T extends string ? T : "unknown type"}.`;

type InferMutationData<T> = [T] extends [MutationPort<string, infer D, unknown, unknown, unknown>]
  ? D
  : NotAMutationPortError<T>;
type InferMutationInput<T> = [T] extends [MutationPort<string, unknown, infer I, unknown, unknown>]
  ? I
  : NotAMutationPortError<T>;
type InferMutationError<T> = [T] extends [MutationPort<string, unknown, unknown, infer E, unknown>]
  ? E
  : NotAMutationPortError<T>;
type InferMutationContext<T> = [T] extends [
  MutationPort<string, unknown, unknown, unknown, infer C>,
]
  ? C
  : NotAMutationPortError<T>;
type InferMutationName<T> = [T] extends [MutationPort<infer N, unknown, unknown, unknown, unknown>]
  ? N
  : NotAMutationPortError<T>;

type InferMutationTypes<T> = [T] extends [MutationPort<infer N, infer D, infer I, infer E, infer C>]
  ? {
      readonly name: N;
      readonly data: D;
      readonly input: I;
      readonly error: E;
      readonly context: C;
    }
  : NotAMutationPortError<T>;
```

_Defined in: [04 - Mutation Ports](./04-mutation-ports.md#18-type-inference-utilities)_

### Guards

```typescript
function isQueryPort(value: unknown): value is QueryPort;
function isMutationPort(value: unknown): value is MutationPort;
```

_Defined in: [03](./03-query-ports.md#14-type-inference-utilities), [04](./04-mutation-ports.md#18-type-inference-utilities)_

## 75. React Hooks

### useQuery

```typescript
// Overload 1: no select, data is TData
function useQuery<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options?: UseQueryOptions<TData, TParams, TError, TData>
): QueryState<TData, TError>;

// Overload 2: with select, data is TSelected
function useQuery<TData, TParams, TError, TName extends string, TSelected>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options: UseQueryOptionsWithSelect<TData, TParams, TError, TSelected>
): QueryState<TSelected, TError>;

// Overload 3: with dependsOn params mapper
function useQuery<
  TData,
  TParams,
  TError,
  TName extends string,
  TDependsOn extends ReadonlyArray<AnyQueryPort>,
>(
  port: QueryPort<TName, TData, TParams, TError, TDependsOn>,
  paramsMapper: (deps: DependencyData<TDependsOn>) => TParams,
  options?: UseQueryOptions<TData, TParams, TError, TData> & {
    readonly dependencyParams: DependencyParamsMap<TDependsOn>;
  }
): QueryState<TData, TError>;
```

### UseQueryOptions (Summary)

```typescript
interface UseQueryOptions<TData, TParams, TError, TSelected = TData> {
  readonly enabled?: boolean;
  readonly staleTime?: number;
  readonly cacheTime?: number;
  readonly refetchOnMount?: boolean | "always";
  readonly refetchOnWindowFocus?: boolean | "always";
  readonly refetchInterval?: number | false;
  readonly refetchIntervalInBackground?: boolean;
  readonly refetchOnReconnect?: boolean | "always";
  readonly retry?: number | boolean | ((failureCount: number, error: TError) => boolean);
  readonly retryDelay?: number | ((attempt: number, error: TError) => number);
  readonly select?: (data: TData) => TSelected;
  readonly placeholderData?:
    | TData
    | ((previousData: TData | undefined, previousParams: TParams | undefined) => TData | undefined);
  readonly throwOnError?: boolean | ((error: TError) => boolean);
  readonly structuralSharing?: boolean;
  readonly meta?: Readonly<Record<string, unknown>>;
}
```

> **Note:** `UseQueryOptions` does not include `onSuccess`, `onError`, or `onSettled`
> callbacks. Use `useEffect` for side effects and `throwOnError` for error boundary
> integration. See [Appendix C8](./15-appendices.md#c8-why-no-onsuccessonerroronsettled-on-queries).

_Defined in: [11 - React Integration](./11-react-integration.md#50-usequery)_

### useMutation

```typescript
function useMutation<TData, TInput, TError, TContext, TName extends string>(
  port: MutationPort<TName, TData, TInput, TError, TContext>,
  options?: UseMutationOptions<TData, TInput, TError, TContext>
): MutationResult<TData, TInput, TError, TContext>;
```

### useQueries

```typescript
function useQueries<TQueries extends ReadonlyArray<QueryConfig>>(
  queries: TQueries
): QueryStateArray<TQueries>;
```

### useInfiniteQuery

```typescript
function useInfiniteQuery<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: Omit<TParams, "cursor">,
  options: UseInfiniteQueryOptions<TData, TError>
): InfiniteQueryState<TData, TError>;
```

### useSuspenseQuery

```typescript
function useSuspenseQuery<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options?: UseSuspenseQueryOptions<TData, TParams, TError>
): SuspenseQueryState<TData, TError>;
```

### useQueryClient

```typescript
function useQueryClient(): QueryClient;
```

### useIsFetching

```typescript
function useIsFetching(filters?: QueryFilters): number;
```

_Defined in: [11 - React Integration](./11-react-integration.md)_

## 76. Testing API

### Test Container

```typescript
function createQueryTestContainer(
  adapters: ReadonlyArray<
    Adapter<Port<unknown, string>, ReadonlyArray<Port<unknown, string>>, string, string>
  >,
  options?: { queryClientConfig?: QueryClientConfig }
): {
  container: Container;
  queryClient: QueryClient;
  dispose: () => void;
};
```

### Test Wrapper (React)

```typescript
function createQueryTestWrapper(
  adapters: ReadonlyArray<Adapter<...>>,
  options?: { queryClientConfig?: QueryClientConfig },
): React.ComponentType<{ children: React.ReactNode }>;
```

### Mock Adapters

```typescript
function createMockQueryAdapter<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  options?: {
    data?: TData | ((params: TParams) => TData);
    error?: TError;
    delay?: number;
  }
): Adapter<QueryPort<TName, TData, TParams, TError>, [], "singleton", "async">;

function createMockMutationAdapter<TData, TInput, TError, TContext, TName extends string>(
  port: MutationPort<TName, TData, TInput, TError, TContext>,
  options?: {
    data?: TData | ((input: TInput) => TData);
    error?: TError;
    delay?: number;
  }
): Adapter<MutationPort<TName, TData, TInput, TError, TContext>, [], "singleton", "async">;
```

Internally, `data` returns `ResultAsync.ok(data)` and `error` returns `ResultAsync.err(error)`.

### Spy Adapter

```typescript
function createSpyQueryAdapter<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  implementation: (params: TParams) => ResultAsync<TData, TError>,
): {
  adapter: Adapter<...>;
  calls: ReadonlyArray<{ params: TParams; timestamp: number }>;
  lastCall: { params: TParams; timestamp: number } | undefined;
  callCount: number;
  reset: () => void;
};
```

### Assertions

```typescript
function expectQueryState<TData, TError>(
  state: QueryState<TData, TError>
): {
  toBeLoading: () => void;
  toBeSuccess: (data?: TData) => void;
  toBeError: (error?: TError) => void;
  toBeRefetching: () => void;
  toBeFresh: () => void;
  toBeStale: () => void;
};

function expectCacheEntry<TData, TParams, TError, TName extends string>(
  queryClient: QueryClient,
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams
): {
  toExist: () => void;
  toNotExist: () => void;
  toHaveData: (expected: TData) => void;
  toBeStale: () => void;
  toBeFresh: () => void;
  toHaveSubscribers: () => void;
  toHaveNoSubscribers: () => void;
};

function expectQueryResult<TData, TError>(
  result: Result<TData, TError> | undefined
): {
  toBeOk: (data?: TData) => void;
  toBeErr: (error?: TError) => void;
  toBeUndefined: () => void;
};
```

### Test Scope Lifecycle

```typescript
function useQueryTestContainer(
  adapters: ReadonlyArray<
    Adapter<Port<unknown, string>, ReadonlyArray<Port<unknown, string>>, string, string>
  >,
  options?: {
    queryClientConfig?: QueryClientConfig;
  }
): UseQueryTestContainerResult;

interface UseQueryTestContainerResult {
  readonly container: Container;
  readonly queryClient: QueryClient;
  readonly scope: Scope;
}
```

```typescript
function createQueryTestScope(
  adapters: ReadonlyArray<
    Adapter<Port<unknown, string>, ReadonlyArray<Port<unknown, string>>, string, string>
  >,
  options?: {
    queryClientConfig?: QueryClientConfig;
  }
): QueryTestScope;

interface QueryTestScope {
  readonly scope: Scope;
  readonly queryClient: QueryClient;
  readonly dispose: () => Promise<void>;
}
```

```typescript
function renderWithQueryContainer(
  ui: React.ReactElement,
  options: {
    adapters: ReadonlyArray<
      Adapter<Port<unknown, string>, ReadonlyArray<Port<unknown, string>>, string, string>
    >;
    queryClientConfig?: QueryClientConfig;
    renderOptions?: Omit<RenderOptions, "wrapper">;
  }
): RenderWithQueryResult;

interface RenderWithQueryResult extends RenderResult {
  readonly queryClient: QueryClient;
}
```

_Defined in: [12 - Testing](./12-testing.md#60c-test-scope-lifecycle-helpers)_

## 77. Query Introspection

### QueryInspectorAPI

```typescript
interface QueryInspectorAPI {
  getSnapshot(): QuerySnapshot;
  getQuerySnapshot<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): QueryEntrySnapshot | undefined;
  listQueryPorts(): ReadonlyArray<QueryPortInfo>;
  getInvalidationGraph(): InvalidationGraph;
  getFetchHistory(filter?: FetchHistoryFilter): ReadonlyArray<FetchHistoryEntry>;
  getCacheStats(): CacheStats;
  getQueryDependencyGraph(): QueryDependencyGraph;
  getDiagnosticSummary(): QueryDiagnosticSummary;
  getQuerySuggestions(): ReadonlyArray<QuerySuggestion>;
  subscribe(listener: (event: QueryInspectorEvent) => void): Unsubscribe;
}
```

### QueryInspectorPort

```typescript
const QueryInspectorPort = createPort<QueryInspectorAPI>()({\
  name: "QueryInspector",
  direction: "outbound",
});
```

### QueryInspectorEvent

```typescript
type QueryInspectorEvent =
  | {
      readonly kind: "fetch-started";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
      readonly timestamp: number;
      readonly trigger: FetchTrigger;
    }
  | {
      readonly kind: "fetch-completed";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
      readonly durationMs: number;
      readonly result: "success" | "error";
      readonly traceSpanId?: string;
    }
  | {
      readonly kind: "fetch-cancelled";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
    }
  | {
      readonly kind: "cache-hit";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
      readonly fresh: boolean;
    }
  | {
      readonly kind: "deduplicated";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
    }
  | {
      readonly kind: "invalidated";
      readonly portName: string;
      readonly params: unknown | undefined;
      readonly source: "manual" | "mutation";
      readonly mutationName?: string;
      readonly cascadeDepth: number;
    }
  | {
      readonly kind: "gc-collected";
      readonly portName: string;
      readonly params: unknown;
      readonly cacheKey: CacheKey;
    }
  | {
      readonly kind: "subscriber-added";
      readonly portName: string;
      readonly params: unknown;
      readonly subscriberCount: number;
    }
  | {
      readonly kind: "subscriber-removed";
      readonly portName: string;
      readonly params: unknown;
      readonly subscriberCount: number;
    }
  | {
      readonly kind: "retry";
      readonly portName: string;
      readonly params: unknown;
      readonly attempt: number;
      readonly delayMs: number;
      readonly error: string;
    }
  | {
      readonly kind: "dependency-cycle-detected";
      readonly path: readonly string[];
      readonly source: "enabled";
      readonly timestamp: number;
    };

type FetchTrigger =
  | "mount"
  | "refetch-manual"
  | "refetch-focus"
  | "refetch-interval"
  | "refetch-reconnect"
  | "invalidation"
  | "mutation-effect"
  | "prefetch"
  | "ensure";
```

### QueryDiagnosticSummary

```typescript
interface QueryDiagnosticSummary {
  readonly totalQueries: number;
  readonly activeQueries: number;
  readonly staleQueries: number;
  readonly errorQueries: number;
  readonly cacheHitRate: number;
  readonly avgFetchDurationMs: number;
  readonly pendingFetches: number;
  readonly dedupSavings: number;
}
```

### QuerySuggestion

Follows the same `{ type, portName, message, action }` shape as `GraphSuggestion`.

```typescript
interface QuerySuggestion {
  readonly type:
    | "stale_query"
    | "invalidation_storm"
    | "high_error_rate"
    | "unused_observer"
    | "missing_adapter"
    | "large_cache_entry";
  readonly portName: string;
  readonly message: string;
  readonly action: string;
}
```

_Defined in: [09b - Query Introspection](./09b-introspection.md)_

## 78. SSR Utilities

### dehydrate

```typescript
/**
 * Extract all cache entries into a serializable object.
 */
function dehydrate(queryClient: QueryClient): DehydratedState;
```

### hydrate

```typescript
/**
 * Populate a QueryClient's cache from a dehydrated state.
 * Existing entries with newer timestamps take precedence.
 */
function hydrate(queryClient: QueryClient, state: DehydratedState): void;
```

### DehydratedState

```typescript
interface DehydratedState {
  readonly queries: ReadonlyArray<{
    readonly cacheKey: readonly [portName: string, paramsHash: string];
    readonly result:
      | { readonly _tag: "Ok"; readonly value: unknown }
      | { readonly _tag: "Err"; readonly error: unknown };
    readonly dataUpdatedAt: number;
    readonly staleTime: number;
  }>;
  readonly version: 2;
}
```

### HydrationBoundary

```typescript
function HydrationBoundary(props: {
  state: DehydratedState;
  children: React.ReactNode;
}): React.ReactElement;
```

_Defined in: [13 - Advanced Patterns](./13-advanced.md#68c-server-side-rendering-streaming-ssr-and-react-server-components)_

---

_Previous: [13 - Advanced Patterns](./13-advanced.md)_

_Next: [15 - Appendices](./15-appendices.md)_
