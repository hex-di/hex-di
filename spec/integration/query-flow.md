# Integration: Query + Flow

[<- query-saga.md](./query-saga.md) | [README](./README.md)

---

## 1. Overview

Query manages data fetching with caching, staleness tracking, and automatic refetching. Flow manages finite state machines with typed transitions and effect execution. Neither library imports the other -- integration happens through port composition in `GraphBuilder`.

Three integration patterns:

1. **Machine effect triggers query fetch** -- `Effect.invoke(QueryPort, "fetch", params)` loads data during a state transition
2. **Machine effect invalidates query** -- after completing a workflow, the machine invalidates stale cache entries
3. **Query state drives machine transitions** -- an activity subscribes to query state and emits events to the machine

---

## 2. Integration Architecture

```
+-------------------+            +-------------------+
|   @hex-di/flow    |            |  @hex-di/query    |
|  Effect.invoke()  |            |  createQueryPort()|
|  Effect.spawn()   |            |  QueryClientPort  |
+--------+----------+            +--------+----------+
         |    No direct imports           |
         +---------+     +----------------+
                   v     v
          +--------------------+
          |   GraphBuilder     |
          |   .provide(...)    |
          +--------+-----------+
                   v
          +--------------------+
          |  createContainer() |
          +--------------------+
```

Flow machines invoke query ports through `Effect.invoke(QueryPort, "fetch", params)`. The `DIEffectExecutor` resolves the fetcher from the container scope. Query caching, staleness, and retries are handled behind the port boundary.

---

## 4. Integration Patterns

### Pattern 1: Machine Effect Triggers Query Fetch

A data-loading machine uses `Effect.invoke` to fetch data, transitioning through `idle -> loading -> loaded | error`.

```typescript
import { defineMachine, Effect } from "@hex-di/flow";
import { createQueryPort } from "@hex-di/query";

const UsersPort = createQueryPort<User[], void>()({
  name: "Users",
  defaults: { staleTime: 30_000 },
});

const UserListMachine = defineMachine({
  id: "userList",
  initial: "idle",
  context: { users: [] as readonly User[], errorMessage: null as string | null },
  states: {
    idle: {
      on: {
        LOAD: {
          target: "loading",
          effects: () => Effect.invoke(UsersPort, "fetch", undefined),
        },
      },
    },
    loading: {
      on: {
        "done.invoke.Users": {
          target: "loaded",
          actions: (ctx, event) => ({ ...ctx, users: event.payload, errorMessage: null }),
        },
        "error.invoke.Users": {
          target: "error",
          actions: (ctx, event) => ({
            ...ctx,
            errorMessage: `Failed to load users: ${event.payload.cause}`,
          }),
        },
      },
    },
    loaded: {
      on: {
        REFRESH: {
          target: "loading",
          effects: () => Effect.invoke(UsersPort, "fetch", undefined),
        },
      },
    },
    error: {
      on: {
        RETRY: {
          target: "loading",
          effects: () => Effect.invoke(UsersPort, "fetch", undefined),
        },
      },
    },
  },
});
```

`done.invoke.Users` carries fetched data as the payload. `error.invoke.Users` carries an `EffectExecutionError` with the query error as `cause`.

### Pattern 2: Machine Effect Invalidates Query

After a mutation succeeds, the machine invalidates relevant query cache entries.

```typescript
import { defineMachine, Effect } from "@hex-di/flow";
import { createMutationPort } from "@hex-di/query";
import type { QueryClientPort } from "@hex-di/query";

const CreateUserPort = createMutationPort<{ name: string; email: string }, User>()({
  name: "CreateUser",
});

const CreateUserMachine = defineMachine({
  id: "createUser",
  initial: "editing",
  context: { formData: { name: "", email: "" }, createdUser: null as User | null },
  states: {
    editing: {
      on: {
        SUBMIT: {
          target: "submitting",
          effects: ctx => Effect.invoke(CreateUserPort, "mutate", ctx.formData),
        },
      },
    },
    submitting: {
      on: {
        "done.invoke.CreateUser": {
          target: "success",
          actions: (ctx, event) => ({ ...ctx, createdUser: event.payload }),
          effects: () => Effect.invoke(QueryClientPort, "invalidate", [UsersPort]),
        },
        "error.invoke.CreateUser": {
          target: "editing",
          actions: (ctx, event) => ({ ...ctx, errorMessage: `Failed: ${event.payload.cause}` }),
        },
      },
    },
    success: { on: { RESET: { target: "editing" } } },
  },
});
```

`QueryClientPort.invalidate([UsersPort])` marks the users cache as stale. The next `useQuery(UsersPort)` mount triggers a fresh fetch.

### Pattern 3: Query State Drives Machine Transitions

An activity subscribes to query state and emits events to the machine.

```typescript
import { activity, createActivityPort, defineEvents, Effect } from "@hex-di/flow";

const QueryObserverEvents = defineEvents({
  QUERY_LOADING: () => ({}),
  QUERY_SUCCESS: (data: User[]) => ({ data }),
  QUERY_ERROR: (error: unknown) => ({ error }),
});

const UsersQueryObserverPort = createActivityPort<void, void>()("UsersQueryObserver");

const UsersQueryObserverActivity = activity(UsersQueryObserverPort, {
  requires: [UsersPort],
  emits: QueryObserverEvents,
  execute: async (_input, { deps, sink, signal }) => {
    sink.emit("QUERY_LOADING");
    const result = await deps.Users(undefined, { signal });
    result.match(
      data => sink.emit("QUERY_SUCCESS", data),
      error => sink.emit("QUERY_ERROR", error)
    );
  },
});

const DashboardMachine = defineMachine({
  id: "dashboard",
  initial: "idle",
  context: { users: [] as readonly User[], isLoading: false, errorMessage: null as string | null },
  states: {
    idle: {
      on: {
        ACTIVATE: {
          target: "observing",
          effects: () => Effect.spawn(UsersQueryObserverPort),
        },
      },
    },
    observing: {
      on: {
        QUERY_LOADING: { target: "observing", actions: ctx => ({ ...ctx, isLoading: true }) },
        QUERY_SUCCESS: {
          target: "observing",
          actions: (ctx, event) => ({ ...ctx, users: event.payload.data, isLoading: false }),
        },
        QUERY_ERROR: {
          target: "observing",
          actions: (ctx, event) => ({
            ...ctx,
            isLoading: false,
            errorMessage: `${event.payload.error}`,
          }),
        },
        DEACTIVATE: { target: "idle" },
      },
    },
  },
});
```

When the machine exits `observing`, the activity is cancelled via `AbortSignal`.

---

## 6. Error Handling

Query errors are wrapped in `EffectExecutionError` when invoked via `Effect.invoke`:

```typescript
interface EffectExecutionError {
  readonly _tag: "InvokeError";
  readonly portName: string; // e.g., "Users"
  readonly method: string; // e.g., "fetch"
  readonly cause: unknown; // The query's TError
}
```

Discriminate the cause in the machine's error handler:

```typescript
"error.invoke.Users": {
  target: "error",
  actions: (ctx, event) => {
    const cause = event.payload.cause;
    if (typeof cause === "object" && cause !== null && "_tag" in cause) {
      return { ...ctx, errorMessage: `Query error: ${cause._tag}` };
    }
    return { ...ctx, errorMessage: "Unknown query error" };
  },
},
```

---

## 7. Testing

Provide a mock query adapter returning fixed `ResultAsync` values:

```typescript
import { createAdapter } from "@hex-di/core";
import { ok, ResultAsync } from "@hex-di/result";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

const MockUsersAdapter = createAdapter(UsersPort, {
  factory: () => (_params: void) =>
    ResultAsync.fromResult(
      ok<User[]>([
        { id: "1", name: "Alice", email: "alice@example.com" },
        { id: "2", name: "Bob", email: "bob@example.com" },
      ])
    ),
  lifetime: "scoped",
});

const testGraph = GraphBuilder.create()
  .provide(MockUsersAdapter)
  .provide(UserListFlowAdapter)
  .build();

const container = createContainer({ graph: testGraph, name: "Test" });
const userListFlow = container.createScope("test").resolve(UserListFlowPort);

await userListFlow.sendAndExecute({ type: "LOAD" });
expect(userListFlow.state()).toBe("loaded");
expect(userListFlow.context().users).toHaveLength(2);
```

---

## 8. Anti-Patterns

### 1. Polling from Machine Instead of Using refetchInterval

**Wrong:** Building a polling loop with `Effect.delay` and self-transitions.

**Right:** Configure `refetchInterval` on the query port defaults:

```typescript
const UsersPort = createQueryPort<User[]>()({
  name: "Users",
  defaults: { refetchInterval: 5000 },
});
```

### 2. Storing Query Data in Machine Context Long-Term

**Wrong:** Copying fetched data into machine context and treating it as the source of truth. The data becomes stale as the query cache updates independently.

**Right:** Use the query cache as the source of truth. Machine context should only store transient UI state (loading flags, error messages, selection state). Read current data from the query layer at render time.

---

[<- query-saga.md](./query-saga.md) | [README](./README.md)
