# 13 - Advanced Patterns

## 61. Dependent Queries

Queries that depend on the result of another query declare this dependency at the port
level via `dependsOn`. The GraphBuilder validates the dependency graph at compile time,
and the `useQuery` hook automatically defers execution until dependency data is available.

### Port-Level Dependencies (Compile-Time Validated)

The primary pattern for query dependencies is `dependsOn` in the port config:

```typescript
// Port declarations: structural dependencies
const UserByIdPort = createQueryPort<User, { id: string }>()({
  name: "UserById",
});

const UserPostsPort = createQueryPort<Post[], { authorId: string }>()({
  name: "UserPosts",
  dependsOn: [UserByIdPort], // Compile-time: must exist in graph, no cycles
});
```

The component uses `useQuery` with a params mapper that receives dependency data:

```typescript
function UserPosts({ userId }: { userId: string }) {
  // First: fetch the user
  const { data: user } = useQuery(UserByIdPort, { id: userId });

  // Second: useQuery knows UserPostsPort dependsOn UserByIdPort.
  // It automatically defers until UserByIdPort has data, then calls
  // the params mapper with the dependency data.
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
```

### Chained Dependencies

Multiple dependencies and transitive chains are fully supported:

```typescript
const OrderByIdPort = createQueryPort<Order, { id: string }>()({
  name: "OrderById",
});

const CustomerByIdPort = createQueryPort<Customer, { id: string }>()({
  name: "CustomerById",
  dependsOn: [OrderByIdPort], // Customer lookup needs order data
});

const ShippingRatePort = createQueryPort<ShippingRate, { zip: string; weight: number }>()({
  name: "ShippingRate",
  dependsOn: [CustomerByIdPort, OrderByIdPort], // Needs both
});

// Compile-time: GraphBuilder validates the entire chain:
// ShippingRate -> [Customer, Order]
// Customer -> [Order]
// Order -> [] (leaf)
// No cycles detected
```

### Compile-Time Cycle Detection

Circular `dependsOn` declarations are caught at compile time, using the same
`IsReachable<TDepGraph, TCurrent, TTarget>` algorithm that catches adapter cycles:

```typescript
// COMPILE ERROR: Circular query dependency detected.
const APort = createQueryPort<A, void>()({ name: "A", dependsOn: [BPort] });
const BPort = createQueryPort<B, void>()({ name: "B", dependsOn: [APort] });

const graph = GraphBuilder.create()
  .provide(AAdapter)
  .provide(BAdapter)

  .build();
// ERROR: Circular query dependency detected. "A" depends on a query
// that transitively depends back on "A".
```

### Typed Error Accumulation with safeTry

For imperative-style multi-step query chains with typed error accumulation:

```typescript
import { safeTry } from "@hex-di/result";

async function loadUserDashboard(userId: string) {
  return safeTry(async function* () {
    const user = yield* queryClient.fetch(UserByIdPort, { id: userId });
    const posts = yield* queryClient.fetch(UserPostsPort, { authorId: user.id });
    const stats = yield* queryClient.fetch(UserStatsPort, { userId: user.id });
    return { user, posts, stats };
  });
  // Type: ResultAsync<{ user: User; posts: Post[]; stats: Stats }, UserError | PostError | StatsError | QueryResolutionError>
}
```

### Dynamic Dependencies (Runtime Escape Hatch)

For conditional execution that depends on runtime state (not structural data
dependencies), the `enabled` option remains:

```typescript
// Dynamic: only fetch when search query is long enough
const { data } = useQuery(
  SearchPort,
  { query },
  { enabled: query.length >= 3 } // Runtime condition
);
```

**Design principle:** `dependsOn` for structural data dependencies (A always needs B).
`enabled` for conditional execution (fetch only when X is true).

### Adapter-Level Dependencies

For complex fetch chains where an adapter needs to resolve other data, declare those
dependencies explicitly via `requires`. The `FetchContext` does not carry a QueryClient
reference -- all dependencies must be declared in the adapter's requirements:

```typescript
const OrderWithDetailsAdapter = createQueryAdapter(OrderDetailPort, {
  requires: [HttpClientPort, CustomerByIdPort, ProductByIdPort],
  factory:
    ({ HttpClient: httpClient, CustomerById: fetchCustomer, ProductById: fetchProduct }) =>
    (params, { signal }) =>
      ResultAsync.fromPromise(httpClient.get(`/api/orders/${params.id}`, { signal }), error =>
        classifyHttpError(error)
      ).andThen(order =>
        ResultAsync.combine([
          fetchCustomer({ id: order.data.customerId }, { signal }),
          fetchProduct({ id: order.data.productId }, { signal }),
        ]).map(([customer, product]) => ({ ...order.data, customer, product }))
      ),
});
```

> **Design note:** The original draft used `client.prefetch()` from FetchContext for
> adapter-level dependencies. This was removed because it creates hidden dependencies
> not visible in the dependency graph. Using explicit `requires` ensures all
> dependencies are tracked and validated at compile time.

### Runtime Cycle Detection (Fallback for `enabled`)

For the rare cases where `enabled` creates dynamic circular dependencies at runtime
(not catchable at compile time), the `QueryInspectorAPI` provides runtime detection
via `getQueryDependencyGraph()`:

```typescript
interface QueryDependencyGraph {
  /** Static edges: from dependsOn declarations (compile-time validated) */
  readonly staticEdges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly source: "dependsOn";
  }>;

  /** Dynamic edges: from enabled flag analysis (runtime observed) */
  readonly dynamicEdges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly source: "enabled";
  }>;

  /** Detected cycles (static cycles are impossible if compile-time validation passed) */
  readonly cycles: ReadonlyArray<{
    readonly path: readonly string[];
    readonly source: "dependsOn" | "enabled";
  }>;
}
```

Static cycles (from `dependsOn`) are caught at compile time and never appear here.
Dynamic cycles (from `enabled` patterns) are detected at runtime and surfaced via
the `"dependency-cycle-detected"` inspector event.

## 62. Parallel Queries

Execute multiple independent queries simultaneously.

### useQueries

```typescript
function Dashboard() {
  const results = useQueries([
    { port: UsersPort, params: {}, options: { staleTime: 30_000 } },
    { port: ProductsPort, params: {}, options: { staleTime: 60_000 } },
    { port: OrderStatsPort, params: { period: "week" } },
  ]);

  const [users, products, stats] = results;
  const isLoading = results.some(r => r.isPending);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <Grid>
      <UsersSummary users={users.data} />
      <ProductsSummary products={products.data} />
      <StatsChart stats={stats.data} />
    </Grid>
  );
}
```

### Typed Parallel Composition

```typescript
const dashboardResult = await ResultAsync.collect({
  users: queryClient.fetch(UsersPort, {}),
  products: queryClient.fetch(ProductsPort, {}),
  stats: queryClient.fetch(OrderStatsPort, { period: "week" }),
});
// Type: Result<{ users: User[]; products: Product[]; stats: OrderStats }, UserError | ProductError | StatsError | QueryResolutionError>

dashboardResult.match(
  ({ users, products, stats }) => renderDashboard(users, products, stats),
  error => renderError(error)
);
```

### Dynamic Parallel Queries

```typescript
function UserAvatars({ userIds }: { userIds: readonly string[] }) {
  const userQueries = useQueries(
    userIds.map(id => ({
      port: UserByIdPort,
      params: { id },
      options: { staleTime: 300_000 },
    })),
  );

  return (
    <AvatarGroup>
      {userQueries.map((query, i) =>
        query.data ? (
          <Avatar key={userIds[i]} src={query.data.avatarUrl} />
        ) : (
          <AvatarPlaceholder key={userIds[i]} />
        ),
      )}
    </AvatarGroup>
  );
}
```

### Server-Side Parallel Prefetch

```typescript
async function dashboardLoader() {
  const queryClient = getQueryClient();

  // Prefetch all dashboard data in parallel
  const prefetchResult = await ResultAsync.collect({
    users: queryClient.prefetch(UsersPort, {}),
    products: queryClient.prefetch(ProductsPort, {}),
    stats: queryClient.prefetch(OrderStatsPort, { period: "week" }),
  });

  prefetchResult.match(
    () => {
      /* all prefetches succeeded */
    },
    error => console.error("Prefetch failed:", error)
  );

  return null;
}
```

### Error Recovery with orElse

Gracefully degrade when a query fails by falling back to cached or default data:

```typescript
const result = await queryClient.fetch(UsersPort, {}).orElse(error => {
  // Fall back to cached data if fetch fails
  const cached = queryClient.getQueryData(UsersPort, {});
  return cached ? ok(cached) : err(error);
});
```

## 63. Pagination & Infinite Scroll

### Cursor-Based Pagination (Infinite Query)

```typescript
interface UsersPage {
  readonly users: readonly User[];
  readonly nextCursor: string | undefined;
  readonly totalCount: number;
}

const PaginatedUsersPort = createQueryPort<UsersPage, { role?: string }>()({
  name: "PaginatedUsers",
  defaults: { staleTime: 30_000 },
});

function InfiniteUserList({ role }: { role?: string }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteQuery(
    PaginatedUsersPort,
    { role },
    {
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  if (isPending) return <Spinner />;

  const allUsers = data?.pages.flatMap(page => page.users) ?? [];

  return (
    <div>
      <VirtualList items={allUsers} renderItem={(user) => <UserRow user={user} />} />
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
```

### Offset-Based Pagination

```typescript
function PaginatedTable() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isFetching } = useQuery(
    UsersPort,
    { page, limit: pageSize },
    {
      placeholderData: (previousData) => previousData,
    },
  );

  return (
    <div style={{ opacity: isFetching ? 0.5 : 1, transition: "opacity 0.2s" }}>
      <Table data={data?.users ?? []} />
      <Pagination
        page={page}
        totalPages={Math.ceil((data?.total ?? 0) / pageSize)}
        onChange={setPage}
      />
    </div>
  );
}
```

The `placeholderData: (prev) => prev` pattern keeps the previous page visible while the next page loads, preventing layout shift.

### Adapter for Paginated Data

```typescript
const PaginatedUsersAdapter = createQueryAdapter(PaginatedUsersPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: httpClient }) =>
    (params, { signal, pageParam }) =>
      ResultAsync.fromPromise(
        httpClient
          .get("/api/users", {
            params: {
              role: params.role,
              cursor: pageParam,
              limit: 20,
            },
            signal,
          })
          .then(r => r.data),
        error => classifyHttpError(error)
      ),
});
```

The `pageParam` comes from `FetchContext` and is managed by the infinite query system.

## 64. Optimistic Updates

See [06 - Mutation Adapters, Section 25](./06-mutation-adapters.md#25-optimistic-update-protocol) for the protocol. This section covers additional patterns.

### List Item Update

```typescript
const { mutate } = useMutation(UpdateTodoPort, {
  onMutate: async input => {
    // Cancel in-flight refetches to prevent overwriting our optimistic update
    await queryClient.cancel(TodosPort);

    // Snapshot current state for rollback
    const previous = queryClient.getQueryData(TodosPort, {}) ?? [];

    // Optimistically update the cache
    queryClient.setQueryData(TodosPort, {}, old =>
      (old ?? []).map(todo => (todo.id === input.id ? { ...todo, ...input } : todo))
    );

    return { previous };
  },
  onError: (_err, _input, context) => {
    if (context?.previous) {
      queryClient.setQueryData(TodosPort, {}, context.previous);
    }
  },
  onSettled: () => {
    queryClient.invalidate(TodosPort);
  },
});
```

### List Item Addition

```typescript
const { mutate } = useMutation(CreateTodoPort, {
  onMutate: async input => {
    await queryClient.cancel(TodosPort);
    const previous = queryClient.getQueryData(TodosPort, {}) ?? [];

    // Add optimistic item with temporary ID
    const optimistic: Todo = {
      id: `temp-${crypto.randomUUID()}`,
      ...input,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    queryClient.setQueryData(TodosPort, {}, old => [...(old ?? []), optimistic]);
    return { previous };
  },
  onError: (_err, _input, context) => {
    if (context?.previous) {
      queryClient.setQueryData(TodosPort, {}, context.previous);
    }
  },
  onSettled: () => {
    queryClient.invalidate(TodosPort);
  },
});
```

### List Item Deletion

```typescript
const { mutate } = useMutation(DeleteTodoPort, {
  onMutate: async input => {
    await queryClient.cancel(TodosPort);
    const previous = queryClient.getQueryData(TodosPort, {}) ?? [];

    queryClient.setQueryData(TodosPort, {}, old =>
      (old ?? []).filter(todo => todo.id !== input.id)
    );

    return { previous };
  },
  onError: (_err, _input, context) => {
    if (context?.previous) {
      queryClient.setQueryData(TodosPort, {}, context.previous);
    }
  },
  onSettled: () => {
    queryClient.invalidate(TodosPort);
  },
});
```

## 65. Polling & Real-Time

### Interval Polling

```typescript
// Poll every 5 seconds
const { data } = useQuery(
  NotificationsPort,
  {},
  {
    refetchInterval: 5_000,
    refetchIntervalInBackground: false, // Pause when tab is hidden
  }
);
```

### Conditional Polling

```typescript
function OrderTracker({ orderId }: { orderId: string }) {
  const { data: order } = useQuery(
    OrderByIdPort,
    { id: orderId },
    {
      // Poll every 3 seconds while order is processing, stop when delivered
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "delivered" || status === "cancelled") return false;
        return 3_000;
      },
    },
  );

  return <OrderStatus order={order} />;
}
```

### Streamed Real-Time Data

For true real-time data, use streamed query adapters instead of polling:

```typescript
const LiveNotificationsPort = createQueryPort<Notification[], void>()({
  name: "LiveNotifications",
  defaults: { staleTime: Infinity },
});

const SSENotificationsAdapter = createStreamedQueryAdapter(LiveNotificationsPort, {
  requires: [EventSourcePort],
  factory:
    ({ EventSource: es }) =>
    (_params, { signal }) => ({
      stream: es.subscribe("/api/notifications/stream", { signal }),
      reducer: (notifications, event) => [event, ...notifications].slice(0, 50),
      initialValue: [],
      refetchMode: "reset",
    }),
});
```

### WebSocket with Reconnection

```typescript
const LivePricesAdapter = createStreamedQueryAdapter(PricesPort, {
  requires: [WebSocketPort],
  factory:
    ({ WebSocket: ws }) =>
    (_params, { signal }) => ({
      stream: ws.subscribe("prices", {
        signal,
        reconnect: true,
        reconnectDelay: 1_000,
      }),
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

## 66. Prefetching

### On Hover

```typescript
function UserLink({ userId, name }: { userId: string; name: string }) {
  const queryClient = useQueryClient();

  return (
    <Link
      to={`/users/${userId}`}
      onMouseEnter={() => {
        queryClient.prefetch(UserByIdPort, { id: userId });
      }}
    >
      {name}
    </Link>
  );
}
```

### In Route Loaders

```typescript
// React Router loader
async function userPageLoader({ params }: LoaderFunctionArgs) {
  const queryClient = getQueryClient();

  // ensureQueryData returns ResultAsync AND populates cache
  const result = await queryClient.ensureQueryData(UserByIdPort, { id: params.userId! });

  return result.match(
    user => ({ user }),
    error => {
      throw new Response("Not Found", { status: 404 });
    }
  );
}
```

### On Component Mount (eager)

```typescript
function UserDashboard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  // Eagerly prefetch data that sub-components will need
  useEffect(() => {
    queryClient.prefetch(UserPostsPort, { authorId: userId });
    queryClient.prefetch(UserFollowersPort, { userId });
    queryClient.prefetch(UserActivityPort, { userId });
  }, [queryClient, userId]);

  return (
    <Tabs>
      <Tab label="Posts"><UserPosts userId={userId} /></Tab>
      <Tab label="Followers"><UserFollowers userId={userId} /></Tab>
      <Tab label="Activity"><UserActivity userId={userId} /></Tab>
    </Tabs>
  );
}
```

### Stale-While-Revalidate Pattern

`ensureQueryData` returns cached data immediately if available and fresh:

```typescript
const result = await queryClient.ensureQueryData(UsersPort, {});
// Returns ResultAsync:
// - Ok(cached data) if data exists in cache AND is not stale (within staleTime)
// - Otherwise fetches fresh data and returns the ResultAsync
result.match(
  data => renderUsers(data),
  error => renderError(error)
);
```

## 67. Offline Support

Offline support is provided through the `CachePersisterPort` and `networkMode` configuration.

### Cache Persistence

```typescript
// Persistence port
const LocalStoragePersisterAdapter = createAdapter({
  provides: CachePersisterPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    save: (cache: SerializedCache) => {
      localStorage.setItem("hex-di-query-cache", JSON.stringify(cache));
    },
    load: (): SerializedCache | undefined => {
      const raw = localStorage.getItem("hex-di-query-cache");
      return raw ? JSON.parse(raw) : undefined;
    },
    remove: () => {
      localStorage.removeItem("hex-di-query-cache");
    },
  }),
});

// QueryClient configured with persister
const container = createContainer(graph);
const persister = container.resolve(CachePersisterPort);
const queryClient = createQueryClient(container, {
  persister: {
    persister,
    buster: "v1.2.0", // Invalidate cache on version change
    maxAge: 24 * 60 * 60 * 1_000, // 24 hours max cache age
  },
});
```

### Network Modes

```typescript
// "online" (default): Only fetch when online. Pause when offline.
const { data } = useQuery(
  UsersPort,
  {},
  {
    networkMode: "online",
  }
);

// "always": Always fetch, even when offline (for local-first).
const { data } = useQuery(
  LocalDataPort,
  {},
  {
    networkMode: "always",
  }
);

// "offlineFirst": Use cache first, fetch in background when online.
const { data } = useQuery(
  UsersPort,
  {},
  {
    networkMode: "offlineFirst",
  }
);
```

### Offline Mutation Queue

Mutations that fail due to network errors can be queued for later execution:

```typescript
const { mutate } = useMutation(CreateTodoPort, {
  retry: (failureCount, error) => {
    if (error._tag === "NetworkError") {
      return true; // Retry indefinitely on network errors
    }
    return failureCount < 3;
  },
  retryDelay: attempt => Math.min(1000 * 2 ** attempt, 60_000),
});
```

### Persistence Buster

When the data schema changes between app versions, the persisted cache may contain stale shapes. The `buster` string invalidates the persisted cache when it changes:

```typescript
// v1.0: User has { name: string }
// v1.1: User has { firstName: string, lastName: string }
// Bumping buster from "v1.0" to "v1.1" clears the persisted cache
persister: {
  persister: localStoragePersister,
  buster: "v1.1",
},
```

## 68. Query Composition

### Computed Queries

Derive new data from cached queries using the `select` option:

```typescript
// Get only admin users from the full users list
function AdminList() {
  const { data: admins } = useQuery(
    UsersPort,
    {},
    { select: (users) => users.filter(u => u.role === "admin") },
  );

  return <UserList users={admins ?? []} />;
}

// Get only user names
function UserNameTags() {
  const { data: names } = useQuery(
    UsersPort,
    {},
    { select: (users) => users.map(u => u.name) },
  );

  return <TagList tags={names ?? []} />;
}
```

The `select` transform runs on every cache update. Because of structural sharing, if the selected result is referentially equal to the previous result, no re-render occurs.

### Shared Base Query

Multiple components can use the same port with different `select` transforms. The cache stores the full data once; each component derives what it needs:

```typescript
// Both components share one cache entry for UsersPort({})
// Only one network request is made

// Component A: shows count
function UserCount() {
  const { data: count } = useQuery(
    UsersPort,
    {},
    { select: (users) => users.length },
  );
  return <Badge count={count ?? 0} />;
}

// Component B: shows admin names
function AdminNames() {
  const { data: names } = useQuery(
    UsersPort,
    {},
    { select: (users) => users.filter(u => u.role === "admin").map(u => u.name) },
  );
  return <List items={names ?? []} />;
}
```

### Query Result Aggregation

Combine data from multiple queries in a custom hook:

```typescript
function useDashboardStats() {
  const { data: users } = useQuery(UsersPort, {});
  const { data: orders } = useQuery(OrdersPort, {});
  const { data: revenue } = useQuery(RevenuePort, { period: "month" });

  return useMemo(
    () => ({
      totalUsers: users?.length ?? 0,
      totalOrders: orders?.length ?? 0,
      monthlyRevenue: revenue?.total ?? 0,
      avgOrderValue: orders && revenue ? revenue.total / orders.length : 0,
    }),
    [users, orders, revenue]
  );
}
```

### Cross-Port Invalidation

When a mutation should invalidate queries across multiple ports, declare all affected ports in the effects:

```typescript
const ImportUsersPort = createMutationPort<ImportResult, File>()({
  name: "ImportUsers",
  effects: {
    invalidates: [
      UsersPort, // User list needs refresh
      UserStatsPort, // User statistics need refresh
      DashboardPort, // Dashboard aggregations need refresh
    ],
  },
});
```

## 68b. Cross-Graph Query Dependencies

When multiple teams own separate graphs or when parent/child container hierarchies exist,
query `dependsOn` declarations must be validated across graph boundaries. This section
specifies how `GraphBuilder.merge()` and `GraphBuilder.forParent()` handle query
dependency validation.

### Merged Graph Validation

When two graphs are merged via `GraphBuilder.merge()`, the query dependency maps from
both sides are unioned. A query port in Graph1 can declare `dependsOn` referencing a
port that only exists in Graph2 -- the merged graph validates the dependency at compile time.

```typescript
// Team A's graph: UserById port with no deps
const UserByIdPort = createQueryPort<User, { id: string }>()({
  name: "UserById",
});

const UserByIdAdapter = createQueryAdapter(UserByIdPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: http }) =>
    (params, { signal }) =>
      ResultAsync.fromPromise(
        http.get(`/api/users/${params.id}`, { signal }).then(r => r.data),
        error => classifyHttpError(error)
      ),
});

const teamAGraph = GraphBuilder.create()
  .provide(HttpClientAdapter)
  .provide(UserByIdAdapter)
  .build();

// Team B's graph: UserPosts depends on UserById (from Team A)
const UserPostsPort = createQueryPort<Post[], { authorId: string }>()({
  name: "UserPosts",
  dependsOn: [UserByIdPort],
});

const UserPostsAdapter = createQueryAdapter(UserPostsPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: http }) =>
    (params, { signal }) =>
      ResultAsync.fromPromise(
        http.get(`/api/posts?author=${params.authorId}`, { signal }).then(r => r.data),
        error => classifyHttpError(error)
      ),
});

const teamBGraph = GraphBuilder.create()
  .provide(HttpClientAdapter)
  .provide(UserPostsAdapter)
  .build();

// App root: merge validates that UserById exists for UserPosts' dependsOn
const appGraph = GraphBuilder.create()
  .merge(teamAGraph)
  .merge(teamBGraph)

  .build();
// Compiles: UserPostsPort.dependsOn: [UserByIdPort] -- UserByIdPort provided by teamAGraph
```

If Team B's graph is used without merging Team A's graph, the build fails at compile time:

```typescript
const incompleteBGraph = GraphBuilder.create()
  .merge(teamBGraph)

  .build();
// COMPILE ERROR: Query "UserPosts" dependsOn references port "UserById"
// which is not provided in the graph.
```

### Parent-Child Graph Queries

`GraphBuilder.forParent(parentGraph)` allows child graph query ports to declare
`dependsOn` referencing query ports provided by the parent. The child container
resolves parent dependencies through scope hierarchy.

```typescript
// Parent graph: shared infrastructure + core queries
const parentGraph = GraphBuilder.create()
  .provide(HttpClientAdapter)
  .provide(AuthAdapter)
  .provide(UserByIdAdapter)

  .build();

// Child graph: feature-specific queries that depend on parent ports
const OrgMembersPort = createQueryPort<Member[], { orgId: string }>()({
  name: "OrgMembers",
  dependsOn: [UserByIdPort], // Provided by parent
});

const OrgMembersAdapter = createQueryAdapter(OrgMembersPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: http }) =>
    (params, { signal }) =>
      ResultAsync.fromPromise(
        http.get(`/api/orgs/${params.orgId}/members`, { signal }).then(r => r.data),
        error => classifyHttpError(error)
      ),
});

const childGraph = GraphBuilder.forParent(parentGraph).provide(OrgMembersAdapter).build();
// Compiles: UserByIdPort found in parent graph
```

At runtime, the child scope resolves `UserByIdPort` from the parent container:

```typescript
const parentContainer = createContainer(parentGraph);
const childScope = parentContainer.createScope(childGraph);

// OrgMembers query can access UserById data through the parent
const scopedClient = queryClient.createChild(childScope);
const orgMembers = await scopedClient.fetch(OrgMembersPort, { orgId: "1" });
```

### Federated Pattern

A shared package defines query port contracts. Separate team graphs provide adapters.
The app root merges all graphs and validates the complete dependency graph.

```typescript
// @company/query-contracts (shared package)
export const UserByIdPort = createQueryPort<User, { id: string }>()({ name: "UserById" });
export const UserPostsPort = createQueryPort<Post[], { authorId: string }>()({
  name: "UserPosts",
  dependsOn: [UserByIdPort],
});
export const PostCommentsPort = createQueryPort<Comment[], { postId: string }>()({
  name: "PostComments",
  dependsOn: [UserPostsPort],
});

// @company/team-users (provides UserById adapter)
import { UserByIdPort } from "@company/query-contracts";
export const teamUsersGraph = GraphBuilder.create().provide(UserByIdRestAdapter).build();

// @company/team-content (provides UserPosts + PostComments adapters)
import { UserPostsPort, PostCommentsPort } from "@company/query-contracts";
export const teamContentGraph = GraphBuilder.create()
  .provide(UserPostsRestAdapter)
  .provide(PostCommentsRestAdapter)
  .build();

// @company/app (merges all, validates complete dependency graph)
const appGraph = GraphBuilder.create()
  .merge(teamUsersGraph)
  .merge(teamContentGraph)
  .provide(HttpClientAdapter)

  .build();
// Compile-time validates entire dependency chain:
// PostComments -> UserPosts -> UserById  (all present)
```

### Cross-Graph Cycle Detection

Cycles that only become visible after merge are caught at merge time. If Graph1 has
port A depending on port B, and Graph2 has port B depending on port A, the merged graph
reports a cycle.

```typescript
// Graph 1: A depends on B
const APort = createQueryPort<A, void>()({ name: "A", dependsOn: [BPort] });
const graph1 = GraphBuilder.create().provide(AAdapter).build();

// Graph 2: B depends on A (creates cycle when merged with Graph 1)
const BPort = createQueryPort<B, void>()({ name: "B", dependsOn: [APort] });
const graph2 = GraphBuilder.create().provide(BAdapter).build();

// Merge reveals the cycle
const merged = GraphBuilder.create()
  .merge(graph1)
  .merge(graph2)

  .build();
// COMPILE ERROR: Circular query dependency detected. "A" depends on a query
// that transitively depends back on "A".
```

The same validation applies to parent-child hierarchies: if a parent port declares
`dependsOn` a child port and the child port declares `dependsOn` the parent port,
the cycle is caught when building the child graph via `GraphBuilder.forParent()`.

## 68c. Server-Side Rendering, Streaming SSR, and React Server Components

### Server-Side Prefetching

On the server, create a per-request scope (matching HexDI's scoped container pattern
used in Hono middleware at `integrations/hono/src/middleware.ts`), prefetch data, then
dehydrate the cache state for client-side hydration.

```typescript
// Server entry point (e.g., Express/Hono handler)
async function handleRequest(req: Request): Promise<Response> {
  // Per-request scope -- isolated cache, auth, and adapters
  const scope = rootContainer.createScope();

  // Resolve a fresh QueryClient for this request
  const scopedClient = queryClient.createChild(scope);

  // Prefetch data the page needs
  await ResultAsync.collect({
    users: scopedClient.prefetch(UsersPort, {}),
    config: scopedClient.prefetch(AppConfigPort, {}),
  });

  // Dehydrate cache state into a serializable object
  const dehydratedState = dehydrate(scopedClient);

  // Render the app
  const html = renderToString(
    <ContainerProvider container={scope}>
      <QueryClientProvider client={scopedClient}>
        <HydrationBoundary state={dehydratedState}>
          <App />
        </HydrationBoundary>
      </QueryClientProvider>
    </ContainerProvider>,
  );

  // Dispose the scope (cancels pending queries, cleans up)
  scope.dispose();

  return new Response(wrapInShell(html, dehydratedState), {
    headers: { "Content-Type": "text/html" },
  });
}
```

### Dehydrate / Hydrate Protocol

```typescript
/**
 * Extract all cache entries from a QueryClient into a serializable object.
 * Both successful and errored entries are included.
 */
function dehydrate(queryClient: QueryClient): DehydratedState;

/**
 * Populate a QueryClient's cache from a dehydrated state object.
 * Entries are merged into the existing cache (existing entries take precedence
 * if they have newer dataUpdatedAt timestamps).
 */
function hydrate(queryClient: QueryClient, state: DehydratedState): void;

interface DehydratedState {
  /** Serialized cache entries */
  readonly queries: ReadonlyArray<{
    readonly cacheKey: readonly [portName: string, paramsHash: string];
    readonly result:
      | { readonly _tag: "Ok"; readonly value: unknown }
      | { readonly _tag: "Err"; readonly error: unknown };
    readonly dataUpdatedAt: number;
    readonly staleTime: number;
  }>;
  /** Protocol version for forward compatibility */
  readonly version: 2;
}
```

### Client-Side Hydration

On the client, wrap the app in `HydrationBoundary` to pre-populate the cache before
any `useQuery` hooks mount:

```typescript
// Client entry point
function ClientApp() {
  // dehydratedState is embedded in the HTML by the server
  const dehydratedState = window.__HEX_QUERY_STATE__;

  return (
    <HexDIProvider graph={clientGraph}>
      <QueryClientProvider client={scopedClient}>
        <HydrationBoundary state={dehydratedState}>
          <App />
        </HydrationBoundary>
      </QueryClientProvider>
    </HexDIProvider>
  );
}
```

`HydrationBoundary` calls `hydrate(queryClient, state)` on mount. Components that call
`useQuery` for prefetched ports find fresh data in the cache and skip the initial fetch.

### Streaming SSR

For `renderToPipeableStream` (React 18+), the pattern extends to support Suspense
boundaries that resolve during streaming:

```typescript
async function handleStreamingRequest(req: Request): Promise<Response> {
  const scope = rootContainer.createScope();
  const scopedClient = queryClient.createChild(scope);

  // Prefetch critical data before streaming starts
  await scopedClient.prefetch(AppConfigPort, {});

  const { pipe } = renderToPipeableStream(
    <ContainerProvider container={scope}>
      <QueryClientProvider client={scopedClient}>
        <App />
      </QueryClientProvider>
    </ContainerProvider>,
    {
      onShellReady() {
        // Begin streaming the shell immediately
        pipe(res);
      },
      onAllReady() {
        // Append dehydrated state at stream end (captures all queries
        // that resolved during streaming, including Suspense boundaries)
        const state = dehydrate(scopedClient);
        res.write(`<script>window.__HEX_QUERY_STATE__=${JSON.stringify(state)}</script>`);
        res.end();
        scope.dispose();
      },
    },
  );
}
```

Queries inside `<Suspense>` boundaries that fire `useSuspenseQuery` resolve during
streaming. Their results are captured in the dehydrated state appended at stream end.

### React Server Components

In the RSC model, server components and client components have different data access patterns:

| Component Type   | Data Access                    | Hooks Allowed                      |
| ---------------- | ------------------------------ | ---------------------------------- |
| Server Component | `queryClient.fetch()` directly | No (no hooks in server components) |
| Client Component | `useQuery()` / `useMutation()` | Yes                                |

```typescript
// Server Component: direct fetch (no hooks)
async function UserProfilePage({ userId }: { userId: string }) {
  const queryClient = getRequestScopedQueryClient();
  const result = await queryClient.fetch(UserByIdPort, { id: userId });

  return result.match(
    (user) => (
      <div>
        <h1>{user.name}</h1>
        {/* Client component receives data as props or uses useQuery */}
        <UserActions userId={userId} />
      </div>
    ),
    (error) => <ErrorDisplay error={error} />,
  );
}

// Client Component: hooks for interactivity
"use client";
function UserActions({ userId }: { userId: string }) {
  const { mutate } = useMutation(FollowUserPort);
  return <button onClick={() => mutate({ userId })}>Follow</button>;
}
```

**Cache boundary:** Server component cache is per-request (scope-based) and is NOT
shared with client components. Client components maintain their own QueryClient cache.
Data flows from server to client via props or dehydrated state, not shared cache.

### Hono Middleware Integration

The Hono middleware (`integrations/hono/src/middleware.ts`) provides a natural
integration point for SSR query prefetching:

```typescript
import { createScopeMiddleware } from "@hex-di/hono";

// Middleware: creates per-request scope with QueryClient
app.use("*", createScopeMiddleware(rootContainer));

// Route: prefetch + dehydrate
app.get("/users", async (c) => {
  const scope = c.get("hexdi:scope");
  const scopedClient = queryClient.createChild(scope);

  await scopedClient.prefetch(UsersPort, {});
  const state = dehydrate(scopedClient);

  return c.html(renderToString(
    <ContainerProvider container={scope}>
      <QueryClientProvider client={scopedClient}>
        <HydrationBoundary state={state}>
          <UsersPage />
        </HydrationBoundary>
      </QueryClientProvider>
    </ContainerProvider>,
  ));
});
```

### SSR Compatibility Note

All HexDI Query hooks use `useEffect` (not `useLayoutEffect`) for side effects. This
matches the pattern established in `integrations/react/src/auto-scope-provider.tsx`
and ensures no SSR warnings about `useLayoutEffect` on the server.

---

_Previous: [12 - Testing](./12-testing.md)_

_Next: [14 - API Reference](./14-api-reference.md)_
