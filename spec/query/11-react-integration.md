# 11 - React Integration

## 49. QueryClientProvider

The `QueryClientProvider` provides a `QueryClient` instance to child hooks via React context. Unlike the old `QueryProvider`, it does **not** resolve the client from the container -- the client is passed explicitly:

```typescript
function QueryClientProvider({
  client,
  children,
}: {
  readonly client: QueryClient;
  readonly children: React.ReactNode;
}) {
  return (
    <QueryClientContext.Provider value={client}>
      {children}
    </QueryClientContext.Provider>
  );
}
```

### Setup

```typescript
const container = createContainer(graph);
const queryClient = createQueryClient(container);

function App() {
  return (
    <ContainerProvider container={container}>
      <QueryClientProvider client={queryClient}>
        <Router />
      </QueryClientProvider>
    </ContainerProvider>
  );
}
```

> **Design note:** The original `QueryProvider` resolved the QueryClient from the
> container via `container.resolve(QueryClientPort)`. This required the QueryClient
> to be a port in the graph and forced `QueryProvider` to be a child of `HexDIProvider`.
> The new `QueryClientProvider` accepts the client directly, decoupling React context
> setup from container resolution. For scoped clients, wrap scope boundaries with
> a new `QueryClientProvider` providing the child client.

## 50. useQuery

```typescript
/**
 * useQuery has three overloads:
 * 1. Without select: returns QueryState<TData, TError>
 * 2. With select: returns QueryState<TSelected, TError>
 * 3. With dependsOn params mapper: the second argument is a function that
 *    receives resolved dependency data and returns TParams.
 *
 * Overload 3 is used when the port declares `dependsOn`. The hook
 * automatically subscribes to the dependency ports' data, defers
 * execution until all dependencies have data, and passes the resolved
 * data to the params mapper function.
 */

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
    /** Params for resolving each dependency port */
    readonly dependencyParams: DependencyParamsMap<TDependsOn>;
  }
): QueryState<TData, TError>;

/**
 * Maps a dependsOn tuple to an object of resolved data.
 * { UserById: User; OrderById: Order } for dependsOn: [UserByIdPort, OrderByIdPort]
 */
type DependencyData<TDependsOn extends ReadonlyArray<AnyQueryPort>> = {
  readonly [K in TDependsOn[number] as InferQueryName<K>]: InferQueryData<K>;
};

/**
 * Maps a dependsOn tuple to an object of params needed to resolve each dependency.
 * { UserById: { id: string }; OrderById: { id: string } }
 */
type DependencyParamsMap<TDependsOn extends ReadonlyArray<AnyQueryPort>> = {
  readonly [K in TDependsOn[number] as InferQueryName<K>]: InferQueryParams<K>;
};
```

### QueryState

The `QueryState` type includes a `result` field that provides the full `Result<TData, TError>`
for exhaustive handling via `result.match()`:

```typescript
interface QueryState<TData, TError> {
  readonly status: QueryStatus;
  readonly data: TData | undefined;
  readonly error: TError | null;
  readonly isPending: boolean;
  readonly isLoading: boolean;
  readonly isSuccess: boolean;
  readonly isError: boolean;
  readonly isFetching: boolean;
  readonly isRefetching: boolean;
  readonly dataUpdatedAt: number | undefined;
  readonly errorUpdatedAt: number | undefined;
  readonly refetch: () => ResultAsync<TData, TError | QueryResolutionError>;
  readonly isPlaceholderData: boolean;

  /**
   * The Result<TData, TError> from the last completed fetch.
   * Undefined while the query has never completed (initial pending state).
   * Enables exhaustive handling via result.match(onOk, onErr).
   */
  readonly result: Result<TData, TError> | undefined;
}
```

### UseQueryOptions

```typescript
interface UseQueryOptions<TData, TParams, TError, TSelected = TData> {
  /** Whether the query should execute (default: true) */
  readonly enabled?: boolean;

  /** Time before data is considered stale (ms) */
  readonly staleTime?: number;

  /** Time to keep unused data in cache (ms) */
  readonly cacheTime?: number;

  /** Refetch behavior on mount */
  readonly refetchOnMount?: boolean | "always";

  /** Refetch behavior on window focus */
  readonly refetchOnWindowFocus?: boolean | "always";

  /** Polling interval in ms (false to disable) */
  readonly refetchInterval?: number | false;

  /** Continue polling when window is not focused */
  readonly refetchIntervalInBackground?: boolean;

  /** Refetch on network reconnect */
  readonly refetchOnReconnect?: boolean | "always";

  /** Retry configuration. Callback receives typed TError. */
  readonly retry?: number | boolean | ((failureCount: number, error: TError) => boolean);

  /** Delay between retries. Callback receives typed TError. */
  readonly retryDelay?: number | ((attempt: number, error: TError) => number);

  /**
   * Transform the data before returning to component.
   * When provided, the return type of useQuery changes from
   * QueryState<TData> to QueryState<TSelected>.
   */
  readonly select?: (data: TData) => TSelected;

  /** Keep previous data while fetching new params */
  readonly placeholderData?:
    | TData
    | ((previousData: TData | undefined, previousParams: TParams | undefined) => TData | undefined);

  /**
   * Whether errors should be thrown to the nearest error boundary.
   * When `true`, calls `result.expect()` under the hood, unwrapping
   * the Err and throwing it for React error boundary propagation.
   * When a function, it receives the typed TError and returns whether to throw.
   */
  readonly throwOnError?: boolean | ((error: TError) => boolean);

  /** Structural sharing for stable references (default: true) */
  readonly structuralSharing?: boolean;

  /** Custom metadata passed to the fetcher */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** Options type that requires select, used by overload 2 */
interface UseQueryOptionsWithSelect<TData, TParams, TError, TSelected> extends UseQueryOptions<
  TData,
  TParams,
  TError,
  TSelected
> {
  readonly select: (data: TData) => TSelected;
}
```

> **Design note (no query callbacks):** `UseQueryOptions` intentionally omits
> `onSuccess`, `onError`, and `onSettled` callbacks. These were removed in
> TanStack Query v5 because they fire on every render that transitions to the
> corresponding state, leading to stale closure bugs and unintended side effects.
> **Mutations keep their callbacks** because mutation lifecycle is imperative
> (fire-once), not declarative (every-render). For query-level side effects, use
> `useEffect` watching the query state, or `throwOnError` to propagate errors to
> error boundaries. See [Appendix C8](./15-appendices.md#c8-why-no-onsuccessonerroronsettled-on-queries).

> **Design note:** The original draft had `select?: <TSelected>(data: TData) => TSelected`
> with an inline generic. This does not work in TypeScript -- the generic is on the
> _function_, not on the _property_. The corrected design lifts `TSelected` to the
> `UseQueryOptions` type parameter and uses overloads to change the return type when
> `select` is provided.

### Usage Examples

```typescript
// Basic usage
function UsersList() {
  const { data, isPending, error } = useQuery(UsersPort, { role: "admin" });

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

// With options (side effects via useEffect, errors via throwOnError)
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, refetch } = useQuery(
    UserByIdPort,
    { id: userId },
    {
      staleTime: 60_000,
      throwOnError: true,
    },
  );

  // Side effects belong in useEffect, not query callbacks (see Appendix C8)
  useEffect(() => {
    if (data) {
      analytics.track("user_profile_viewed", { userId: data.id });
    }
  }, [data]);

  if (isLoading) return <ProfileSkeleton />;

  return (
    <div>
      <h1>{data?.name}</h1>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}

// Conditional query
function SearchResults({ query }: { query: string }) {
  const { data, isFetching } = useQuery(
    SearchPort,
    { query },
    { enabled: query.length >= 3 },
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

// With dependsOn params mapper (auto-deferred until dependency data available)
function UserPosts({ userId }: { userId: string }) {
  const { data: user } = useQuery(UserByIdPort, { id: userId });

  // UserPostsPort has dependsOn: [UserByIdPort].
  // The hook automatically waits for UserByIdPort data, then calls the mapper.
  const { data: posts } = useQuery(
    UserPostsPort,
    (deps) => ({ authorId: deps.UserById.id }),
    { dependencyParams: { UserById: { id: userId } } },
  );

  if (!user) return <Spinner />;

  return (
    <div>
      <h1>{user.name}'s Posts</h1>
      {posts?.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  );
}

// With placeholder data (previously "keepPreviousData")
function PaginatedUsers() {
  const [page, setPage] = useState(1);

  const { data, isFetching } = useQuery(
    UsersPort,
    { page, limit: 10 },
    {
      placeholderData: (previousData) => previousData,
    },
  );

  return (
    <div style={{ opacity: isFetching ? 0.5 : 1 }}>
      <UserList users={data?.users ?? []} />
      <Pagination page={page} onChange={setPage} />
    </div>
  );
}

// Exhaustive rendering with result.match()
function UserProfileWithResult({ userId }: { userId: string }) {
  const { result, isPending } = useQuery(UserByIdPort, { id: userId });

  if (isPending) return <Spinner />;
  if (!result) return null;

  return result.match(
    (user) => (
      <div>
        <h1>{user.name}</h1>
        <p>{user.email}</p>
      </div>
    ),
    (error) => {
      switch (error._tag) {
        case "NotFound": return <NotFoundPage />;
        case "Forbidden": return <AccessDenied />;
        default: return <ErrorMessage error={error} />;
      }
    },
  );
}
```

## 51. useMutation

```typescript
function useMutation<TData, TInput, TError, TContext, TName extends string>(
  port: MutationPort<TName, TData, TInput, TError, TContext>,
  options?: UseMutationOptions<TData, TInput, TError, TContext>
): MutationResult<TData, TInput, TError, TContext>;
```

### UseMutationOptions

```typescript
interface UseMutationOptions<TData, TInput, TError, TContext> {
  /** Called before mutation executes (for optimistic updates) */
  onMutate?: (input: TInput) => Promise<TContext> | TContext;

  /** Called on successful mutation */
  onSuccess?: (data: TData, input: TInput, context: TContext) => void;

  /** Called on mutation error */
  onError?: (error: TError, input: TInput, context: TContext | undefined) => void;

  /** Called when mutation settles */
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    input: TInput,
    context: TContext | undefined
  ) => void;

  /** Retry configuration */
  retry?: number | boolean;

  /** Delay between retries */
  retryDelay?: number;

  /** Mutation scope key for serial execution */
  scope?: { id: string };
}
```

### MutationResult

```typescript
interface MutationResult<TData, TInput, TError, TContext> {
  readonly status: "idle" | "pending" | "success" | "error";
  readonly isIdle: boolean;
  readonly isPending: boolean;
  readonly isSuccess: boolean;
  readonly isError: boolean;
  readonly data: TData | undefined;
  readonly error: TError | null;
  readonly variables: TInput | undefined;
  readonly context: TContext | undefined;

  /**
   * The Result<TData, TError> from the last completed mutation.
   * Undefined while the mutation is idle or has never completed.
   * Enables exhaustive handling via result.match(onOk, onErr).
   */
  readonly result: Result<TData, TError> | undefined;

  /** Trigger the mutation (fire-and-forget) */
  readonly mutate: (
    input: TInput,
    options?: MutateCallbacks<TData, TInput, TError, TContext>
  ) => void;

  /** Trigger and await the mutation. Returns ResultAsync for typed error handling. */
  readonly mutateAsync: (
    input: TInput,
    options?: MutateCallbacks<TData, TInput, TError, TContext>
  ) => ResultAsync<TData, TError>;

  /** Reset mutation state to idle */
  readonly reset: () => void;
}
```

### Usage Examples

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
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}

// Optimistic update
function TodoItem({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();
  const { mutate } = useMutation(UpdateTodoPort, {
    onMutate: async (input) => {
      await queryClient.cancel(TodosPort);
      const previous = queryClient.getQueryData(TodosPort, {});
      queryClient.setQueryData(TodosPort, {}, (old) =>
        old?.map(t => t.id === input.id ? { ...t, ...input } : t)
      );
      return { previous: previous ?? [] };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(TodosPort, {}, context.previous);
      }
    },
    onSettled: () => {
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

// Scoped mutations (serial execution)
const { mutate } = useMutation(UpdateOrderPort, {
  scope: { id: "order-updates" }, // Only one at a time
});
```

## 52. useQueries

Execute multiple queries in parallel:

```typescript
function useQueries<TQueries extends ReadonlyArray<QueryConfig>>(
  queries: TQueries,
): QueryStateArray<TQueries>;

// Usage
function Dashboard({ userIds }: { userIds: string[] }) {
  const userQueries = useQueries(
    userIds.map(id => ({
      port: UserByIdPort,
      params: { id },
      options: { staleTime: 60_000 },
    })),
  );

  const isLoading = userQueries.some(q => q.isPending);
  const users = userQueries.map(q => q.data).filter(Boolean);

  if (isLoading) return <Spinner />;
  return <UserGrid users={users} />;
}
```

## 53. useInfiniteQuery

For paginated/infinite scroll data:

```typescript
function useInfiniteQuery<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: Omit<TParams, "cursor">,
  options: UseInfiniteQueryOptions<TData, TError>
): InfiniteQueryState<TData, TError>;

interface UseInfiniteQueryOptions<TData, TError> {
  getNextPageParam: (lastPage: TData, allPages: readonly TData[]) => unknown | undefined;
  getPreviousPageParam?: (firstPage: TData, allPages: readonly TData[]) => unknown | undefined;
  initialPageParam?: unknown;
  maxPages?: number;
  staleTime?: number;
  cacheTime?: number;
}

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

### Usage

```typescript
function InfiniteUserList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    UsersPort,
    { role: "admin" },
    {
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  return (
    <div>
      {data?.pages.flatMap(page => page.users).map(user => (
        <UserCard key={user.id} user={user} />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
```

## 54. useSuspenseQuery

For use with React Suspense:

```typescript
function useSuspenseQuery<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options?: UseSuspenseQueryOptions<TData, TParams, TError>
): SuspenseQueryState<TData, TError>;

interface SuspenseQueryState<TData, TError> {
  readonly data: TData; // Never undefined -- suspends until available
  readonly refetch: () => ResultAsync<TData, TError | QueryResolutionError>;
  readonly dataUpdatedAt: number;
  readonly isRefetching: boolean;
}
```

Internally, `useSuspenseQuery` uses `result.expect()` to unwrap the `Ok` value.
If the query resolves to an `Err`, `result.expect()` throws the error, which
propagates to the nearest React error boundary. This guarantees that `data: TData`
is always available (never undefined) when the component renders.

### Usage

```typescript
function UserProfile({ userId }: { userId: string }) {
  // Suspends until data is ready. data is guaranteed non-undefined.
  // Internally calls result.expect() -- Err propagates to error boundary.
  const { data: user } = useSuspenseQuery(UserByIdPort, { id: userId });

  return <h1>{user.name}</h1>;
}

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

## 55. useQueryClient

Access the QueryClient from the nearest `QueryClientProvider`:

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

## 56. useIsFetching

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

_Previous: [10 - HexDI Integration](./10-integration.md)_

_Next: [12 - Testing](./12-testing.md)_
