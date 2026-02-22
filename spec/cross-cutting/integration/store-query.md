# Integration: Store + Query

[README](./README.md) | [Next: flow-saga.md](./flow-saga.md)

---

## 1. Overview

Store and Query are the most commonly combined HexDI libraries. Store manages local reactive state (atoms, state ports, derived values); Query manages server-side data fetching and caching (queries, mutations). Together they model the complete data lifecycle: fetching from a server, caching results, reflecting them in reactive local state, performing optimistic mutations, and keeping both layers in sync.

The two libraries never import each other. Integration happens entirely through port composition in the GraphBuilder: adapters from each library declare `requires` on ports from the other, and the DI graph wires them together at container creation time.

### When to integrate

| Scenario                         | Store alone | Query alone | Store + Query |
| -------------------------------- | ----------- | ----------- | ------------- |
| Server list with local filters   | -           | x           | x             |
| Offline-first with optimistic UI | -           | -           | x             |
| Derived values from cached data  | -           | -           | x             |
| Pure client-side form state      | x           | -           | -             |
| Simple data fetch with loading   | -           | x           | -             |

## 2. Integration Architecture

```
                  GraphBuilder
                      |
        .-------------+--------------.
        |                            |
   Store Adapters               Query Adapters
   (provides state)             (provides fetchers)
        |                            |
        v                            v
  +-----------+     port deps   +-----------+
  | StatePort | <-------------- | Mutation  |
  | AtomPort  |                 | Adapter   |
  | Derived   | --------------> | Query     |
  +-----------+   port deps     | Adapter   |
        |                       +-----------+
        v                            |
   StateService                 QueryFetcher /
   AtomService                  MutationExecutor
   DerivedService
```

Data flows bidirectionally through ports:

1. **Query to Store** -- Query fetchers populate cache; effect adapters observe cache changes and dispatch store actions.
2. **Store to Query** -- Store state feeds into query params or derived computations that delegate to query fetchers.
3. **Mutation coordination** -- Mutation success triggers both query cache invalidation (via `effects`) and store action dispatch (via a coordination adapter).

## 3. Shared Types

No shared types exist between `@hex-di/store` and `@hex-di/query`. Each library defines its own port and service types independently. The integration relies entirely on the standard HexDI adapter `requires` mechanism to establish cross-library dependencies.

Error types that appear in integration code come from their respective packages:

| Error                | Package         | `_tag`                                                                   |
| -------------------- | --------------- | ------------------------------------------------------------------------ |
| `ResolutionError`    | `@hex-di/core`  | `"ResolutionError"`                                                      |
| `QueryError`         | `@hex-di/query` | `"QueryFetchError"` / `"QueryTimeoutError"` / `"QueryInvalidationCycle"` |
| `StoreDispatchError` | `@hex-di/store` | `"StoreDispatchError"`                                                   |

## 4. Integration Patterns

### Pattern 1: Cache-to-State Sync

A Store adapter observes the Query cache and dispatches state actions to keep local state synchronized with server data. The adapter `requires` both the query port (for cache observation) and the state port (for dispatching actions).

#### Port definitions

```typescript
import { createQueryPort } from "@hex-di/query";
import { createStatePort } from "@hex-di/store";
import type { ActionMap, ActionReducer } from "@hex-di/store";
import type { ResultAsync } from "@hex-di/result";

// Query port: fetches users from API
const UsersQueryPort = createQueryPort<User[], { role?: string }>()({
  name: "UsersQuery",
  defaults: { staleTime: 30_000 },
});

// Store port: local user list state with actions
interface UserListState {
  readonly users: readonly User[];
  readonly lastSyncedAt: number | null;
}

interface UserListActions extends ActionMap<UserListState> {
  setUsers: ActionReducer<UserListState, readonly User[]>;
  markSynced: ActionReducer<UserListState>;
}

const UserListPort = createStatePort<UserListState, UserListActions>()({
  name: "UserList",
  category: "users",
});
```

#### Sync effect adapter

The effect adapter bridges the two ports. It subscribes to query cache changes and dispatches store actions. This adapter is a standalone "glue" adapter whose sole purpose is coordination.

```typescript
import { createAdapter, port } from "@hex-di/core";
import type { QueryCacheObserver } from "@hex-di/query";

// Effect port: the sync service itself (no external consumers)
interface CacheSyncService {
  readonly start: () => void;
  readonly stop: () => void;
}

const UserCacheSyncPort = port<CacheSyncService>()({
  name: "UserCacheSync",
  direction: "outbound",
});

const userCacheSyncAdapter = createAdapter({
  provides: UserCacheSyncPort,
  requires: [UsersQueryPort, UserListPort] as const,
  lifetime: "singleton",
  factory: deps => {
    let unsubscribe: (() => void) | undefined;

    return {
      start: () => {
        // Subscribe to query cache changes for UsersQuery
        unsubscribe = deps.UsersQuery.subscribe(result => {
          result.match(
            users => {
              deps.UserList.actions.setUsers(users);
              deps.UserList.actions.markSynced();
            },
            _error => {
              // Query errors are handled by the query layer;
              // the store retains its last known state.
            }
          );
        });
      },
      stop: () => {
        unsubscribe?.();
        unsubscribe = undefined;
      },
    };
  },
});
```

#### Key design decisions

- The sync adapter is a **separate adapter**, not embedded in either the store or query adapter. This keeps each library adapter focused on its own concern.
- Cache observation uses the query port's `subscribe` method, which emits `Result<TData, TError>` on each cache update.
- Store dispatch happens through the state service's `actions` object, preserving the reducer-based state transition model.

### Pattern 2: Mutation-to-State Coordination

When a mutation succeeds, two things need to happen: query cache invalidation (handled by the mutation port's `effects`) and store state updates (handled by a coordination adapter). The mutation port's `effects` property handles the query side; an additional coordination adapter handles the store side.

#### Port definitions

```typescript
import { createMutationPort } from "@hex-di/query";

interface CreateTodoInput {
  readonly text: string;
}

const TodosQueryPort = createQueryPort<Todo[], void>()({
  name: "TodosQuery",
  defaults: { staleTime: 60_000 },
});

const CreateTodoPort = createMutationPort<Todo, CreateTodoInput>()({
  name: "CreateTodo",
  effects: { invalidates: [TodosQueryPort] },
});
```

#### Coordination adapter

```typescript
import { createAdapter, port } from "@hex-di/core";

// Coordination port: binds mutation results to store actions
interface MutationStoreCoordinator {
  readonly onTodoCreated: (todo: Todo) => void;
}

const TodoMutationCoordinatorPort = port<MutationStoreCoordinator>()({
  name: "TodoMutationCoordinator",
  direction: "outbound",
});

const todoMutationCoordinatorAdapter = createAdapter({
  provides: TodoMutationCoordinatorPort,
  requires: [CreateTodoPort, TodoStatePort] as const,
  lifetime: "singleton",
  factory: deps => ({
    onTodoCreated: (todo: Todo) => {
      // Dispatch to store immediately (optimistic or confirmed)
      deps.TodoState.actions.addItem({ id: todo.id, text: todo.text, done: false });
    },
  }),
});
```

#### Usage in application code

```typescript
import { safeTry, ok, err } from "@hex-di/result";

function handleCreateTodo(input: CreateTodoInput) {
  return safeTry(function* () {
    const mutate = container.resolve(CreateTodoPort);
    const coordinator = container.resolve(TodoMutationCoordinatorPort);

    const todo = yield* mutate(input, {}).safeUnwrap();

    // Query cache is already invalidated by the mutation's effects.
    // Now update the store:
    coordinator.onTodoCreated(todo);

    return ok(todo);
  });
}
```

### Pattern 3: Unified Optimistic Updates

This pattern coordinates Store's `OptimisticState` with Query mutation lifecycle hooks. The store holds optimistic state with pending entries; the mutation's success/failure drives confirmation or rollback.

#### Optimistic state port

```typescript
import { createStatePort } from "@hex-di/store";
import type { ActionMap, ActionReducer } from "@hex-di/store";

interface OptimisticState<T> {
  readonly confirmed: T;
  readonly optimistic: T;
  readonly pending: ReadonlyArray<{ readonly id: string; readonly rollback: T }>;
}

interface TodoState {
  readonly items: ReadonlyArray<{
    readonly id: string;
    readonly text: string;
    readonly done: boolean;
  }>;
}

interface TodoOptimisticActions extends ActionMap<OptimisticState<TodoState>> {
  optimisticAdd: ActionReducer<
    OptimisticState<TodoState>,
    { readonly id: string; readonly text: string }
  >;
  confirm: ActionReducer<OptimisticState<TodoState>, { readonly id: string }>;
  rollback: ActionReducer<OptimisticState<TodoState>, { readonly id: string }>;
}

const TodoOptimisticPort = createStatePort<OptimisticState<TodoState>, TodoOptimisticActions>()({
  name: "TodoOptimistic",
  category: "todo",
});
```

#### Optimistic mutation adapter

```typescript
import { createAdapter, port } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";

interface OptimisticMutationService {
  readonly addTodo: (text: string) => ResultAsync<Todo, MutationError>;
}

const OptimisticTodoMutationPort = port<OptimisticMutationService>()({
  name: "OptimisticTodoMutation",
  direction: "outbound",
});

const optimisticTodoMutationAdapter = createAdapter({
  provides: OptimisticTodoMutationPort,
  requires: [CreateTodoPort, TodoOptimisticPort] as const,
  lifetime: "singleton",
  factory: deps => ({
    addTodo: (text: string) => {
      const pendingId = crypto.randomUUID();

      // Step 1: Apply optimistic update to store immediately
      deps.TodoOptimistic.actions.optimisticAdd({ id: pendingId, text });

      // Step 2: Execute the mutation
      const mutationResult = deps.CreateTodo({ text }, {});

      // Step 3: On success, confirm; on failure, rollback
      return mutationResult
        .map(todo => {
          deps.TodoOptimistic.actions.confirm({ id: pendingId });
          return todo;
        })
        .mapErr(error => {
          deps.TodoOptimistic.actions.rollback({ id: pendingId });
          return error;
        });
    },
  }),
});
```

#### How it works

1. **Before mutation**: The store applies the optimistic change via `optimisticAdd`, recording a rollback snapshot in `pending`.
2. **On success**: `confirm` removes the pending entry and promotes optimistic state to confirmed.
3. **On failure**: `rollback` restores the pre-mutation state from the pending entry.
4. **Query cache**: The mutation port's `effects: { invalidates: [TodosQueryPort] }` ensures the query cache is refreshed after success, converging the cache and store state.

The pending ID (`pendingId`) ties the store's optimistic entry to the mutation lifecycle, ensuring the correct entry is confirmed or rolled back even when multiple mutations are in flight.

### Pattern 4: Query-Driven Derived State

An `AsyncDerivedPort` from Store delegates its computation to a Query fetcher, combining the query layer's caching with the store layer's reactive subscriptions.

#### Port definitions

```typescript
import { createAsyncDerivedPort } from "@hex-di/store";
import { createQueryPort } from "@hex-di/query";

interface ExchangeRate {
  readonly from: string;
  readonly to: string;
  readonly rate: number;
  readonly updatedAt: number;
}

interface ExchangeRateError {
  readonly _tag: "NetworkError";
  readonly cause: unknown;
}

// Query port: fetches exchange rate from API
const ExchangeRateQueryPort = createQueryPort<
  ExchangeRate,
  { from: string; to: string },
  ExchangeRateError
>()({
  name: "ExchangeRateQuery",
  defaults: { staleTime: 60_000, cacheTime: 300_000 },
});

// Async derived port: reactive store-layer view of exchange rate
const ExchangeRatePort = createAsyncDerivedPort<ExchangeRate, ExchangeRateError>()({
  name: "ExchangeRate",
  description: "Reactive exchange rate backed by query cache",
});
```

#### Async derived adapter delegating to query

```typescript
import { createAsyncDerivedAdapter } from "@hex-di/store";

const exchangeRateAdapter = createAsyncDerivedAdapter({
  provides: ExchangeRatePort,
  requires: [ExchangeRateQueryPort, CurrencySettingsPort] as const,
  fetch: deps => {
    const settings = deps.CurrencySettings.state;
    // Delegate to the query fetcher -- the query layer handles caching
    return deps.ExchangeRateQuery({ from: settings.baseCurrency, to: settings.targetCurrency }, {});
  },
});
```

#### Benefits

- **Single source of truth**: The query cache owns the data; the async derived port is a reactive view.
- **Automatic caching**: The query layer's `staleTime` and `cacheTime` apply to all resolutions through this derived port.
- **Reactive subscriptions**: Components subscribing to `ExchangeRatePort` get store-layer reactivity (automatic re-render on data change) while the data itself flows through the query cache.
- **Typed errors**: The `ExchangeRateError` type flows through both layers, enabling exhaustive error handling.

## 5. GraphBuilder Composition

The following example wires all four patterns into a single GraphBuilder:

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// -- Store adapters --
import { createStateAdapter } from "@hex-di/store";

const userListAdapter = createStateAdapter({
  provides: UserListPort,
  initial: { users: [], lastSyncedAt: null },
  actions: {
    setUsers: (state, users) => ({ ...state, users }),
    markSynced: state => ({ ...state, lastSyncedAt: Date.now() }),
  },
  lifetime: "singleton",
});

const todoOptimisticAdapter = createStateAdapter({
  provides: TodoOptimisticPort,
  initial: {
    confirmed: { items: [] },
    optimistic: { items: [] },
    pending: [],
  },
  actions: {
    optimisticAdd: (state, payload) => ({
      ...state,
      optimistic: {
        items: [...state.optimistic.items, { ...payload, done: false }],
      },
      pending: [...state.pending, { id: payload.id, rollback: state.optimistic }],
    }),
    confirm: (state, payload) => ({
      ...state,
      confirmed: state.optimistic,
      pending: state.pending.filter(p => p.id !== payload.id),
    }),
    rollback: (state, payload) => {
      const entry = state.pending.find(p => p.id === payload.id);
      return {
        ...state,
        optimistic: entry?.rollback ?? state.confirmed,
        pending: state.pending.filter(p => p.id !== payload.id),
      };
    },
  },
  lifetime: "singleton",
});

// -- Query adapters --
import { createQueryAdapter, createMutationAdapter } from "@hex-di/query";

const usersQueryAdapter = createQueryAdapter(UsersQueryPort, {
  requires: [HttpClientPort] as const,
  fetcher: (params, _context, deps) => deps.HttpClient.get<User[]>(`/api/users`, { params }),
});

const todosQueryAdapter = createQueryAdapter(TodosQueryPort, {
  requires: [HttpClientPort] as const,
  fetcher: (_params, _context, deps) => deps.HttpClient.get<Todo[]>(`/api/todos`),
});

const createTodoAdapter = createMutationAdapter(CreateTodoPort, {
  requires: [HttpClientPort] as const,
  executor: (input, _context, deps) => deps.HttpClient.post<Todo>(`/api/todos`, input),
});

const exchangeRateQueryAdapter = createQueryAdapter(ExchangeRateQueryPort, {
  requires: [HttpClientPort] as const,
  fetcher: (params, _context, deps) =>
    deps.HttpClient.get<ExchangeRate>(`/api/rates/${params.from}/${params.to}`),
});

// -- Integration adapters --
// (userCacheSyncAdapter, todoMutationCoordinatorAdapter,
//  optimisticTodoMutationAdapter, exchangeRateAdapter
//  defined in Pattern sections above)

// -- Compose the graph --
const graph = GraphBuilder.create()
  // Infrastructure
  .provide(httpClientAdapter)
  .provide(currencySettingsAdapter)
  // Store
  .provide(userListAdapter)
  .provide(todoOptimisticAdapter)
  // Query
  .provide(usersQueryAdapter)
  .provide(todosQueryAdapter)
  .provide(createTodoAdapter)
  .provide(exchangeRateQueryAdapter)
  // Integration glue
  .provide(userCacheSyncAdapter) // Pattern 1: cache-to-state sync
  .provide(todoMutationCoordinatorAdapter) // Pattern 2: mutation-to-state
  .provide(optimisticTodoMutationAdapter) // Pattern 3: unified optimistic
  .provide(exchangeRateAdapter) // Pattern 4: query-driven derived
  .build();

const container = createContainer({ graph, name: "app" });
```

The GraphBuilder validates at compile time that:

- Every adapter's `requires` ports are satisfied by another adapter's `provides`.
- Mutation `effects.invalidates` references ports present in the graph.
- No circular dependency chains exist between adapters.
- Captive dependency violations (singleton depending on scoped) are flagged.

## 6. Error Handling

Integration code composes errors from both libraries using `safeTry` generators.

### Error types

```typescript
interface StoreDispatchError {
  readonly _tag: "StoreDispatchError";
  readonly portName: string;
  readonly action: string;
  readonly cause: unknown;
}

interface QueryFetchError {
  readonly _tag: "QueryFetchError";
  readonly portName: string;
  readonly cause: unknown;
}

interface QueryTimeoutError {
  readonly _tag: "QueryTimeoutError";
  readonly portName: string;
  readonly timeoutMs: number;
}

interface ResolutionError {
  readonly _tag: "ResolutionError";
  readonly portName: string;
  readonly reason: string;
}

type IntegrationError = ResolutionError | QueryFetchError | QueryTimeoutError | StoreDispatchError;
```

### Composing errors with safeTry

```typescript
import { safeTry, ok, err } from "@hex-di/result";
import type { ResultAsync } from "@hex-di/result";

function syncUsersToStore(container: Container): ResultAsync<readonly User[], IntegrationError> {
  return safeTry(async function* () {
    // Resolve query port -- may produce ResolutionError
    const fetchUsers = yield* container.resolveResult(UsersQueryPort).safeUnwrap();

    // Execute query -- may produce QueryFetchError | QueryTimeoutError
    const users = yield* fetchUsers({ role: "active" }, {}).safeUnwrap();

    // Resolve store port -- may produce ResolutionError
    const userList = yield* container.resolveResult(UserListPort).safeUnwrap();

    // Dispatch to store -- may produce StoreDispatchError
    yield* userList.actions.setUsers(users).safeUnwrap();

    return ok(users);
  });
}
```

### Error discrimination

```typescript
const result = await syncUsersToStore(container);

result.match(
  users => {
    console.log(`Synced ${users.length} users`);
  },
  error => {
    switch (error._tag) {
      case "ResolutionError":
        console.error(`Port ${error.portName} not found: ${error.reason}`);
        break;
      case "QueryFetchError":
        console.error(`Fetch failed for ${error.portName}:`, error.cause);
        break;
      case "QueryTimeoutError":
        console.error(`Query ${error.portName} timed out after ${error.timeoutMs}ms`);
        break;
      case "StoreDispatchError":
        console.error(`Store ${error.portName}.${error.action} failed:`, error.cause);
        break;
    }
  }
);
```

## 7. Testing

Integration tests use mock adapters to isolate each library's behavior.

### InMemoryStateAdapter

```typescript
import { createStateAdapter } from "@hex-di/store";

function createInMemoryUserListAdapter(initial: UserListState = { users: [], lastSyncedAt: null }) {
  return createStateAdapter({
    provides: UserListPort,
    initial,
    actions: {
      setUsers: (state, users) => ({ ...state, users }),
      markSynced: state => ({ ...state, lastSyncedAt: Date.now() }),
    },
    lifetime: "singleton",
  });
}
```

### FakeQueryAdapter

```typescript
import { createQueryAdapter } from "@hex-di/query";
import { okAsync } from "@hex-di/result";

function createFakeUsersQueryAdapter(fixedData: User[]) {
  return createQueryAdapter(UsersQueryPort, {
    fetcher: (_params, _context) => okAsync(fixedData),
  });
}
```

### FakeMutationAdapter

```typescript
import { createMutationAdapter } from "@hex-di/query";
import { okAsync } from "@hex-di/result";

function createFakeMutationAdapter(options?: {
  readonly recordCalls?: Array<{ input: CreateTodoInput }>;
  readonly response?: Todo;
}) {
  const calls = options?.recordCalls ?? [];
  const response = options?.response ?? {
    id: "fake-id",
    text: "fake",
    done: false,
  };

  return createMutationAdapter(CreateTodoPort, {
    executor: (input, _context) => {
      calls.push({ input });
      return okAsync(response);
    },
  });
}
```

### Full integration test

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { describe, it, expect } from "vitest";

describe("Store + Query: cache-to-state sync", () => {
  it("syncs query data to store state", async () => {
    const testUsers: User[] = [
      { id: "1", name: "Alice", role: "admin" },
      { id: "2", name: "Bob", role: "user" },
    ];

    const graph = GraphBuilder.create()
      .provide(createInMemoryUserListAdapter())
      .provide(createFakeUsersQueryAdapter(testUsers))
      .provide(userCacheSyncAdapter)
      .build();

    const container = createContainer({ graph, name: "test" });

    const syncService = container.resolve(UserCacheSyncPort);
    syncService.start();

    // Trigger a query fetch (the fake adapter returns testUsers)
    const fetchUsers = container.resolve(UsersQueryPort);
    const result = await fetchUsers({ role: "admin" }, {});

    expect(result.isOk()).toBe(true);

    // Verify store state was updated
    const userList = container.resolve(UserListPort);
    expect(userList.state.users).toEqual(testUsers);
    expect(userList.state.lastSyncedAt).not.toBeNull();

    syncService.stop();
  });
});

describe("Store + Query: optimistic mutation", () => {
  it("rolls back on mutation failure", async () => {
    const failingMutationAdapter = createMutationAdapter(CreateTodoPort, {
      executor: (_input, _context) =>
        errAsync({ _tag: "MutationError" as const, cause: "Server error" }),
    });

    const graph = GraphBuilder.create()
      .provide(todoOptimisticAdapter)
      .provide(failingMutationAdapter)
      .provide(optimisticTodoMutationAdapter)
      .build();

    const container = createContainer({ graph, name: "test" });
    const service = container.resolve(OptimisticTodoMutationPort);
    const store = container.resolve(TodoOptimisticPort);

    const result = await service.addTodo("Buy milk");

    expect(result.isErr()).toBe(true);
    // Optimistic update should have been rolled back
    expect(store.state.optimistic.items).toEqual([]);
    expect(store.state.pending).toEqual([]);
  });
});
```

## 8. Anti-Patterns

### Anti-Pattern 1: Direct query cache access from store

```typescript
// BAD: Store adapter reaches into query internals
const badAdapter = createStateAdapter({
  provides: UserListPort,
  initial: { users: [], lastSyncedAt: null },
  actions: {
    setUsers: (state, users) => ({ ...state, users }),
    markSynced: state => ({ ...state, lastSyncedAt: Date.now() }),
  },
  lifetime: "singleton",
  // This bypasses the port abstraction entirely:
  requires: [QueryClientPort] as const,
  effects: deps => ({
    setUsers: () => {
      // Directly reading query cache internals -- WRONG
      const cached = deps.QueryClient.getQueryData(["UsersQuery"]);
      // ...
      return ResultAsync.of(undefined);
    },
  }),
});
```

**Why it is wrong**: The store adapter couples to the query layer's internal cache key format (`["UsersQuery"]`). If the query port changes its name or key structure, the store adapter silently breaks. Use a coordination adapter (Pattern 1) instead.

### Anti-Pattern 2: Circular sync (store to query to store)

```typescript
// BAD: Store change triggers query, which triggers store change, which triggers query...
const circularSyncAdapter = createAdapter({
  provides: CircularSyncPort,
  requires: [UserListPort, UsersQueryPort] as const,
  lifetime: "singleton",
  factory: deps => ({
    start: () => {
      // Store change -> refetch query
      deps.UserList.subscribe(() => {
        deps.UsersQuery({ role: "all" }, {});
      });
      // Query result -> update store (already done by cache-to-state sync)
      // This creates an infinite loop!
    },
  }),
});
```

**Why it is wrong**: Store dispatch triggers a query fetch, whose cache update triggers a store dispatch, creating an infinite loop. Break the cycle by making sync unidirectional: either query-to-store OR store-to-query, not both simultaneously. If bidirectional sync is needed, use a coordination adapter with change detection (compare old and new state before dispatching).

### Anti-Pattern 3: Dual source of truth

```typescript
// BAD: Same user data lives in both store and query without sync
const UsersQueryPort = createQueryPort<User[]>()({ name: "UsersQuery" });
const UserListPort = createStatePort<{ users: User[] }, UserListActions>()({
  name: "UserList",
});

// Both are populated independently -- which one is authoritative?
// Components reading UsersQueryPort see different data than those reading UserListPort.
```

**Why it is wrong**: When the same data exists in both the query cache and the store with no synchronization, components see inconsistent state depending on which port they resolve. Choose one authoritative source:

- **Query is authoritative**: Use Pattern 1 (cache-to-state sync) to project query data into the store.
- **Store is authoritative**: Use the store as the primary source and only use queries for initial hydration.
- **Derived view**: Use Pattern 4 (query-driven derived state) so the store layer is a reactive view of the query cache, not an independent copy.

---

[README](./README.md) | [Next: flow-saga.md](./flow-saga.md)
