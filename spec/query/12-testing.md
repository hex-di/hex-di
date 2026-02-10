# 12 - Testing

## 57. Test Utilities

The primary testing strategy is **adapter swapping** -- replace production adapters with mock adapters in the graph. No MSW or network mocking needed.

### createQueryTestContainer

```typescript
function createQueryTestContainer(
  adapters: ReadonlyArray<
    Adapter<Port<unknown, string>, ReadonlyArray<Port<unknown, string>>, string, string>
  >,
  options?: {
    queryClientConfig?: QueryClientConfig;
  }
): {
  container: Container;
  queryClient: QueryClient;
  dispose: () => void;
};
```

### Usage

```typescript
const { queryClient, dispose } = createQueryTestContainer([
  MockUsersAdapter,
  MockCreateUserAdapter,
]);

try {
  const result = await queryClient.fetch(UsersPort, {});
  expect(result.isOk()).toBe(true);
  if (result.isOk()) {
    expect(result.value).toEqual([{ id: "1", name: "Test User" }]);
  }
} finally {
  dispose();
}
```

### createQueryTestWrapper (React)

```typescript
function createQueryTestWrapper(
  adapters: ReadonlyArray<
    Adapter<Port<unknown, string>, ReadonlyArray<Port<unknown, string>>, string, string>
  >,
  options?: { queryClientConfig?: QueryClientConfig }
): React.ComponentType<{ children: React.ReactNode }>;
```

### Usage

```typescript
const wrapper = createQueryTestWrapper([MockUsersAdapter]);

render(<UsersList />, { wrapper });

expect(await screen.findByText("Test User")).toBeInTheDocument();
```

## 58. Mock Adapters

### createMockQueryAdapter

Creates a mock query adapter with controlled responses:

```typescript
function createMockQueryAdapter<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  options?: {
    data?: TData | ((params: TParams) => TData);
    error?: TError;
    delay?: number;
  }
): Adapter<QueryPort<TName, TData, TParams, TError>, [], "singleton", "async">;
```

Internally, `data` returns `ResultAsync.ok(data)` and `error` returns `ResultAsync.err(error)`.

### Examples

```typescript
// Static data
const MockUsersAdapter = createMockQueryAdapter(UsersPort, {
  data: [
    { id: "1", name: "Alice", role: "admin" },
    { id: "2", name: "Bob", role: "user" },
  ], // Internally returns ResultAsync.ok(data)
});

// Dynamic data based on params
const MockUserByIdAdapter = createMockQueryAdapter(UserByIdPort, {
  data: params => ({
    id: params.id,
    name: `User ${params.id}`,
    email: `user-${params.id}@example.com`,
  }),
});

// Error response
const ErrorUsersAdapter = createMockQueryAdapter(UsersPort, {
  error: { _tag: "NetworkError", message: "Connection refused" }, // Returns ResultAsync.err(error)
});

// Delayed response (for testing loading states)
const SlowUsersAdapter = createMockQueryAdapter(UsersPort, {
  data: [],
  delay: 1000,
});
```

### createMockMutationAdapter

```typescript
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

### createSpyQueryAdapter

Creates a mock adapter that records all fetch calls:

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

### Usage

```typescript
const spy = createSpyQueryAdapter(UsersPort, params =>
  ResultAsync.ok(
    params.role === "admin" ? [{ id: "1", name: "Admin" }] : [{ id: "2", name: "User" }]
  )
);

const { queryClient } = createQueryTestContainer([spy.adapter]);

await queryClient.fetch(UsersPort, { role: "admin" });
await queryClient.fetch(UsersPort, { role: "user" });

expect(spy.callCount).toBe(2);
expect(spy.calls[0].params).toEqual({ role: "admin" });
expect(spy.calls[1].params).toEqual({ role: "user" });
```

## 59. Query Assertions

### expectQueryState

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
```

### expectCacheEntry

```typescript
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
```

### Result Assertions

```typescript
function expectQueryResult<TData, TError>(
  result: Result<TData, TError> | undefined
): {
  toBeOk: (data?: TData) => void;
  toBeErr: (error?: TError) => void;
  toBeUndefined: () => void;
};
```

### Usage

```typescript
const result = await queryClient.fetch(UsersPort, {});

expectQueryResult(result.isOk() ? result : undefined).toBeOk([{ id: "1", name: "Alice" }]);
```

### Usage

```typescript
test("fetches users and caches result", async () => {
  const { queryClient, dispose } = createQueryTestContainer([MockUsersAdapter]);

  const result = await queryClient.fetch(UsersPort, { role: "admin" });

  expect(result.isOk()).toBe(true);
  if (result.isOk()) {
    expect(result.value).toEqual([{ id: "1", name: "Alice", role: "admin" }]);
  }

  expectCacheEntry(queryClient, UsersPort, { role: "admin" })
    .toExist()
    .toHaveData([{ id: "1", name: "Alice", role: "admin" }])
    .toBeFresh();

  dispose();
});
```

## 60. Scope-Isolated Tests

Each test gets an isolated container scope with its own cache:

```typescript
function createIsolatedQueryTest(
  adapters: ReadonlyArray<Adapter<...>>,
): {
  queryClient: QueryClient;
  container: Container;
  cleanup: () => void;
};

// Usage in test suite
describe("UsersList", () => {
  let queryClient: QueryClient;
  let cleanup: () => void;

  beforeEach(() => {
    const ctx = createIsolatedQueryTest([MockUsersAdapter]);
    queryClient = ctx.queryClient;
    cleanup = ctx.cleanup;
  });

  afterEach(() => {
    cleanup(); // Disposes scope, clears cache, cancels pending
  });

  test("fetches on mount", async () => {
    // Each test has a fresh cache
    const result = await queryClient.fetch(UsersPort, {});
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(2);
    }
  });

  test("invalidation triggers refetch", async () => {
    await queryClient.fetch(UsersPort, {});
    await queryClient.invalidate(UsersPort);
    // ...
  });
});
```

### Testing Loading States

```typescript
test("shows loading spinner", () => {
  const SlowAdapter = createMockQueryAdapter(UsersPort, {
    data: [],
    delay: 1000,
  });

  const wrapper = createQueryTestWrapper([SlowAdapter]);

  render(<UsersList />, { wrapper });

  expect(screen.getByRole("progressbar")).toBeInTheDocument();
});
```

### Testing Error States

```typescript
test("shows error message", async () => {
  const ErrorAdapter = createMockQueryAdapter(UsersPort, {
    error: { _tag: "NetworkError", message: "Network error" },
  });

  const wrapper = createQueryTestWrapper([ErrorAdapter]);

  render(<UsersList />, { wrapper });

  expect(await screen.findByText("Network error")).toBeInTheDocument();
});
```

### Testing Mutations with Cache Effects

```typescript
test("creates user and invalidates list", async () => {
  const users: User[] = [];

  const DynamicUsersAdapter = createQueryAdapter(UsersPort, {
    factory: () => params => ResultAsync.ok([...users]),
  });

  const MockCreateAdapter = createMutationAdapter(CreateUserPort, {
    factory: () => input => {
      const user = { id: crypto.randomUUID(), ...input };
      users.push(user);
      return ResultAsync.ok(user);
    },
  });

  const { queryClient, dispose } = createQueryTestContainer([
    DynamicUsersAdapter,
    MockCreateAdapter,
  ]);

  // Initial fetch: empty
  const initial = await queryClient.fetch(UsersPort, {});
  expect(initial.isOk()).toBe(true);
  if (initial.isOk()) {
    expect(initial.value).toHaveLength(0);
  }

  // Create user
  const createResult = await queryClient.mutate(CreateUserPort, {
    name: "Charlie",
    email: "charlie@test.com",
  });
  expect(createResult.isOk()).toBe(true);

  // After mutation, UsersPort is invalidated. Refetch:
  const updated = await queryClient.fetch(UsersPort, {});
  expect(updated.isOk()).toBe(true);
  if (updated.isOk()) {
    expect(updated.value).toHaveLength(1);
    expect(updated.value[0].name).toBe("Charlie");
  }

  dispose();
});
```

## 60b. Type-Level Tests

Type-level tests verify that query type utilities, compile-time validation, and hook overloads
produce correct types. They live alongside runtime tests in `*.test-d.ts` files and use
`expectTypeOf` from Vitest -- matching the convention established in `@hex-di/graph`.

### File Naming

```
packages/query/tests/
  query-port.test.ts        # Runtime tests
  query-port.test-d.ts      # Type-level tests (same name, .test-d.ts suffix)
```

### Library

All type-level tests use `expectTypeOf` from `vitest`:

```typescript
import { describe, expectTypeOf, it } from "vitest";
```

### Categories

#### Port Type Inference

Verify that `InferQueryData`, `InferQueryParams`, `InferQueryError`, `InferQueryName`,
`InferQueryDependsOn`, and `InferQueryTypes` extract correct types from a `QueryPort`:

```typescript
import { expectTypeOf, it } from "vitest";

const UsersPort = createQueryPort<User[], { role?: string }, ApiError>()({
  name: "Users",
});

it("infers data type", () => {
  expectTypeOf<InferQueryData<typeof UsersPort>>().toEqualTypeOf<User[]>();
});

it("infers params type", () => {
  expectTypeOf<InferQueryParams<typeof UsersPort>>().toEqualTypeOf<{ role?: string }>();
});

it("infers error type", () => {
  expectTypeOf<InferQueryError<typeof UsersPort>>().toEqualTypeOf<ApiError>();
});

it("infers name literal", () => {
  expectTypeOf<InferQueryName<typeof UsersPort>>().toEqualTypeOf<"Users">();
});

it("infers dependsOn tuple", () => {
  expectTypeOf<InferQueryDependsOn<typeof UsersPort>>().toEqualTypeOf<[]>();
});

it("infers all types as object", () => {
  type Types = InferQueryTypes<typeof UsersPort>;
  expectTypeOf<Types["name"]>().toEqualTypeOf<"Users">();
  expectTypeOf<Types["data"]>().toEqualTypeOf<User[]>();
  expectTypeOf<Types["params"]>().toEqualTypeOf<{ role?: string }>();
  expectTypeOf<Types["error"]>().toEqualTypeOf<ApiError>();
});
```

#### InferenceError for Non-Port Input

Non-port inputs produce structured `InferenceError` branded objects (matching the
`DebugInferAdapterProvides` pattern from `@hex-di/core`):

```typescript
it("produces InferenceError for non-port input", () => {
  type Result = InferQueryData<string>;
  expectTypeOf<Result>().toMatchTypeOf<{
    readonly __inferenceError: true;
    readonly __source: "InferQueryData";
  }>();
});

it("produces InferenceError for plain object", () => {
  type Result = InferQueryData<{ name: "Foo" }>;
  expectTypeOf<Result>().toMatchTypeOf<{
    readonly __inferenceError: true;
    readonly __source: "InferQueryData";
    readonly __input: { name: "Foo" };
  }>();
});
```

#### QueryPort extends DirectedPort

Structural subtyping assertion -- `QueryPort` is assignable to `DirectedPort`:

```typescript
it("QueryPort is assignable to DirectedPort", () => {
  expectTypeOf<typeof UsersPort>().toMatchTypeOf<
    DirectedPort<QueryFetcher<User[], { role?: string }>, "Users", "inbound">
  >();
});
```

#### ValidateQueryDependencies

Cycle detection produces error strings; valid deps pass through:

```typescript
type IsCycleError<T> = T extends `ERROR: Circular query dependency detected. ${string}`
  ? true
  : false;

it("valid deps pass validation", () => {
  // A depends on B, no cycle
  type Result = ValidateQueryDependencies<TestDepGraph>;
  expectTypeOf<IsCycleError<Result>>().toEqualTypeOf<false>();
});

it("circular deps produce error", () => {
  // A depends on B, B depends on A
  type Result = ValidateQueryDependencies<CircularDepGraph>;
  expectTypeOf<IsCycleError<Result>>().toEqualTypeOf<true>();
});
```

#### ValidateMutationEffects

Missing port references produce template literal errors with port names:

```typescript
it("valid invalidation targets pass", () => {
  type Result = ValidateMutationEffects<
    typeof CreateUserPort,
    "Users" | "UserStats" // Both exist in graph
  >;
  expectTypeOf<Result>().not.toMatchTypeOf<`ERROR: ${string}`>();
});

it("missing invalidation target produces error with port name", () => {
  type Result = ValidateMutationEffects<
    typeof CreateUserPort,
    "Users" // "UserStats" is missing from graph
  >;
  expectTypeOf<Result>().toMatchTypeOf<`ERROR: Mutation "CreateUser" invalidates port "UserStats" which is not provided in the graph.`>();
});
```

#### ValidateQueryAdapterLifetime

Captive dependency produces error with adapter and port names:

```typescript
it("singleton adapter depending on transient port produces error", () => {
  type Result = ValidateQueryAdapterLifetime<
    "UsersAdapter",
    "singleton",
    "TransientLogger",
    "transient"
  >;
  expectTypeOf<Result>().toMatchTypeOf<`ERROR: Captive dependency in query adapter "UsersAdapter". A singleton adapter cannot depend on transient port "TransientLogger".`>();
});

it("transient adapter depending on singleton port passes", () => {
  type Result = ValidateQueryAdapterLifetime<
    "UsersAdapter",
    "transient",
    "HttpClient",
    "singleton"
  >;
  expectTypeOf<Result>().not.toMatchTypeOf<`ERROR: ${string}`>();
});
```

#### CacheKey Branding

Ad-hoc tuples do not satisfy the `CacheKey` constraint:

```typescript
it("branded CacheKey is not assignable from plain tuple", () => {
  type PlainTuple = readonly ["Users", "abc123"];
  expectTypeOf<PlainTuple>().not.toMatchTypeOf<CacheKey>();
});

it("CacheKey factory produces branded type", () => {
  // createCacheKey returns a properly branded CacheKey
  const key = createCacheKey("Users", { role: "admin" });
  expectTypeOf(key).toMatchTypeOf<CacheKey<"Users">>();
});
```

#### DependencyData Mapped Type

Produces correct `{ [PortName]: PortData }` shape from a `dependsOn` tuple:

```typescript
it("maps dependency tuple to data record", () => {
  type Deps = readonly [
    QueryPort<"UserById", User, { id: string }, Error>,
    QueryPort<"OrgById", Org, { id: string }, Error>,
  ];
  type Result = DependencyData<Deps>;
  expectTypeOf<Result>().toEqualTypeOf<{
    readonly UserById: User;
    readonly OrgById: Org;
  }>();
});
```

#### DependencyParamsMap

Produces correct `{ [PortName]: PortParams }` shape:

```typescript
it("maps dependency tuple to params record", () => {
  type Deps = readonly [
    QueryPort<"UserById", User, { id: string }, Error>,
    QueryPort<"OrgById", Org, { orgId: string }, Error>,
  ];
  type Result = DependencyParamsMap<Deps>;
  expectTypeOf<Result>().toEqualTypeOf<{
    readonly UserById: { id: string };
    readonly OrgById: { orgId: string };
  }>();
});
```

#### FindMissingPorts

Correctly identifies ports not in graph:

```typescript
it("returns never when all deps exist", () => {
  type Result = FindMissingPorts<
    readonly ["UserById", "OrgById"],
    "UserById" | "OrgById" | "HttpClient" // Graph provides all
  >;
  expectTypeOf<Result>().toBeNever();
});

it("returns missing port names", () => {
  type Result = FindMissingPorts<
    readonly ["UserById", "OrgById"],
    "UserById" | "HttpClient" // OrgById missing
  >;
  expectTypeOf<Result>().toEqualTypeOf<"OrgById">();
});
```

#### useQuery Overloads

All 3 overloads resolve to correct return types:

```typescript
declare function useQuery<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options?: UseQueryOptions<TData, TParams, TError, TData>
): QueryState<TData, TError>;

it("overload 1: basic usage returns QueryState<TData, TError>", () => {
  const result = useQuery(UsersPort, { role: "admin" });
  expectTypeOf(result).toEqualTypeOf<QueryState<User[], ApiError>>();
  expectTypeOf(result.data).toEqualTypeOf<User[] | undefined>();
});

it("overload 2: select narrows data type", () => {
  const result = useQuery(UsersPort, {}, { select: users => users.length });
  expectTypeOf(result).toEqualTypeOf<QueryState<number, ApiError>>();
  expectTypeOf(result.data).toEqualTypeOf<number | undefined>();
});

it("overload 3: dependsOn params mapper receives DependencyData", () => {
  const result = useQuery(
    UserPostsPort,
    deps => {
      expectTypeOf(deps).toEqualTypeOf<{ readonly UserById: User }>();
      return { authorId: deps.UserById.id };
    },
    { dependencyParams: { UserById: { id: "1" } } }
  );
  expectTypeOf(result).toEqualTypeOf<QueryState<Post[], Error>>();
});
```

## 60c. Test Scope Lifecycle Helpers

Vitest-aware hooks and manual helpers for query test isolation, modeled on the existing
`useTestContainer` / `createTestContainer` pattern from `@hex-di/testing`.

### useQueryTestContainer

Vitest hook that creates a fresh container with `QueryClient` before each test and disposes
everything after each test. Matches the `useTestContainer` pattern but adds query-specific
lifecycle management.

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
  /** Container for the current test. Throws if accessed outside a test case. */
  readonly container: Container;
  /** QueryClient for the current test. Pre-configured and ready to use. */
  readonly queryClient: QueryClient;
  /** Scope for the current test. Isolated cache partition. */
  readonly scope: Scope;
}
```

**Lifecycle:**

1. `beforeEach`: Creates a fresh `Container` from graph containing provided adapters. Creates a `QueryClient` wrapping the container with an isolated cache.
2. Test body runs using `container`, `queryClient`, `scope` getters.
3. `afterEach`: Cancels all pending queries -> clears scope cache -> disposes scope -> disposes container.

**Usage:**

```typescript
import { useQueryTestContainer } from "@hex-di/query-testing";

describe("UsersList", () => {
  const { queryClient, container } = useQueryTestContainer([
    MockUsersAdapter,
    MockCreateUserAdapter,
  ]);

  it("fetches users", async () => {
    const result = await queryClient.fetch(UsersPort, {});
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(2);
    }
  });

  it("each test gets fresh cache", async () => {
    // No leftover data from previous test
    const state = queryClient.getQueryState(UsersPort, {});
    expect(state).toBeUndefined();
  });
});
```

**Integration with TestGraphBuilder:**

```typescript
import { TestGraphBuilder } from "@hex-di/testing";
import { useQueryTestContainer } from "@hex-di/query-testing";

describe("with TestGraphBuilder", () => {
  const graph = TestGraphBuilder.create()
    .provide(MockUsersAdapter)
    .provide(MockCreateUserAdapter)
    .build();

  const { queryClient } = useQueryTestContainer(graph);

  it("works with pre-built graph", async () => {
    const result = await queryClient.fetch(UsersPort, {});
    expect(result.isOk()).toBe(true);
  });
});
```

### createQueryTestScope

Manual alternative for non-Vitest contexts (integration tests, Playwright, custom runners).
Creates a scoped container from a parent with an isolated cache partition.

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
  /** Scoped container with isolated cache. */
  readonly scope: Scope;
  /** QueryClient bound to the scope's cache partition. */
  readonly queryClient: QueryClient;
  /** Cancels pending queries, clears scope cache, disposes scope. */
  readonly dispose: () => Promise<void>;
}
```

**Usage:**

```typescript
import { createQueryTestScope } from "@hex-di/query-testing";

async function runTest() {
  const { queryClient, dispose } = createQueryTestScope([MockUsersAdapter]);

  try {
    const result = await queryClient.fetch(UsersPort, {});
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      assert(result.value.length === 2);
    }
  } finally {
    await dispose();
  }
}
```

### renderWithQueryContainer

React test helper extending the existing `renderWithContainer` pattern. Wraps React Testing
Library's `render` with `ContainerProvider` + `QueryClientProvider`, and auto-disposes in `afterEach`.

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
  /** QueryClient used by the rendered component tree. */
  readonly queryClient: QueryClient;
}
```

**Usage:**

```typescript
import { renderWithQueryContainer } from "@hex-di/query-testing/react";

it("renders user list", async () => {
  const { queryClient } = renderWithQueryContainer(<UsersList />, {
    adapters: [MockUsersAdapter, MockCreateUserAdapter],
  });

  expect(await screen.findByText("Alice")).toBeInTheDocument();

  // Assert cache state after render
  expectCacheEntry(queryClient, UsersPort, {}).toExist().toBeFresh();
});
```

**Integration with createSpiedMockAdapter:**

```typescript
import { createSpiedMockAdapter } from "@hex-di/testing";
import { renderWithQueryContainer } from "@hex-di/query-testing/react";

it("tracks fetch calls via spy adapter", async () => {
  const SpiedUsersAdapter = createSpiedMockAdapter(UsersPort, {
    fetch: (params) => ResultAsync.ok([{ id: "1", name: "Alice" }]),
  });

  const { queryClient } = renderWithQueryContainer(<UsersList />, {
    adapters: [SpiedUsersAdapter],
  });

  await screen.findByText("Alice");

  // Spy adapter tracks all calls through vi.fn() spies
  expect(SpiedUsersAdapter.fetch).toHaveBeenCalledOnce();
});
```

---

_Previous: [11 - React Integration](./11-react-integration.md)_

_Next: [13 - Advanced Patterns](./13-advanced.md)_
