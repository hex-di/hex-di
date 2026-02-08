/**
 * Query + Flow Integration Tests
 *
 * Tests for cross-library integration patterns between @hex-di/query and @hex-di/flow.
 * Based on spec/integration/query-flow.md and spec/integration/17-definition-of-done.md.
 *
 * Patterns tested:
 * 1. Machine Effect Triggers Query Fetch
 * 2. Machine Effect Invalidates Query
 * 3. Query State Drives Machine Transitions
 *
 * Anti-patterns tested:
 * 1. Polling via Effect.delay instead of refetchInterval
 * 2. Storing query data in machine context long-term diverges from cache
 */

import { describe, it, expect } from "vitest";
import {
  createMockFlowService,
  createFakeQueryAdapter,
  createFakeMutationAdapter,
  createFakeQueryClientAdapter,
} from "../src/index.js";
import type { MockMachineDefinition } from "../src/index.js";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

// ---------------------------------------------------------------------------
// Pattern 1: Machine Effect Triggers Query Fetch
// ---------------------------------------------------------------------------

describe("Query + Flow: Machine Effect Triggers Query Fetch", () => {
  type UserListState = "idle" | "loading" | "loaded" | "error";
  type UserListEvent = "LOAD" | "FETCH_SUCCESS" | "FETCH_ERROR" | "REFRESH" | "RETRY";

  interface UserListContext {
    readonly users: readonly User[];
    readonly errorMessage: string | null;
  }

  const userListMachine: MockMachineDefinition<UserListState, UserListEvent, UserListContext> = {
    id: "userList",
    initial: "idle",
    context: {
      users: [],
      errorMessage: null,
    },
    states: {
      idle: { on: { LOAD: "loading" } },
      loading: {
        on: {
          FETCH_SUCCESS: "loaded",
          FETCH_ERROR: "error",
        },
      },
      loaded: { on: { REFRESH: "loading" } },
      error: { on: { RETRY: "loading" } },
    },
  };

  function createUserListSetup() {
    const query = createFakeQueryAdapter<readonly User[]>({
      name: "Users",
      data: [
        { id: "1", name: "Alice", email: "alice@example.com" },
        { id: "2", name: "Bob", email: "bob@example.com" },
      ],
    });

    const flow = createMockFlowService({ machine: userListMachine });

    // Simulate Effect.invoke for query fetch
    const executeFetch = async () => {
      const result = flow.send("LOAD");
      if (!result.success) return;

      try {
        const data = await query.fetch();
        flow.setContext(ctx => ({ ...ctx, users: data, errorMessage: null }));
        flow.send("FETCH_SUCCESS");
      } catch (error) {
        flow.setContext(ctx => ({
          ...ctx,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        }));
        flow.send("FETCH_ERROR");
      }
    };

    const executeRetry = async () => {
      const result = flow.send("RETRY");
      if (!result.success) return;

      try {
        const data = await query.fetch();
        flow.setContext(ctx => ({ ...ctx, users: data, errorMessage: null }));
        flow.send("FETCH_SUCCESS");
      } catch (error) {
        flow.setContext(ctx => ({
          ...ctx,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        }));
        flow.send("FETCH_ERROR");
      }
    };

    return { query, flow, executeFetch, executeRetry };
  }

  it("machine transitions to loading state and invokes query fetch via Effect.invoke", async () => {
    const { flow, executeFetch } = createUserListSetup();

    expect(flow.state()).toBe("idle");

    await executeFetch();

    // Machine transitioned through loading to loaded
    expect(flow.state()).toBe("loaded");
  });

  it("done.invoke event transitions machine to loaded with fetched data", async () => {
    const { flow, executeFetch } = createUserListSetup();

    await executeFetch();

    expect(flow.state()).toBe("loaded");
    expect(flow.context().users).toHaveLength(2);
    expect(flow.context().users[0].name).toBe("Alice");
    expect(flow.context().errorMessage).toBeNull();
  });

  it("error.invoke event transitions machine to error with error message", async () => {
    const { flow, query } = createUserListSetup();

    // Configure query to fail
    query.setNextResult({ error: new Error("Network timeout") });

    flow.send("LOAD");

    try {
      await query.fetch();
      flow.send("FETCH_SUCCESS");
    } catch (error) {
      flow.setContext(ctx => ({
        ...ctx,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      }));
      flow.send("FETCH_ERROR");
    }

    expect(flow.state()).toBe("error");
    expect(flow.context().errorMessage).toBe("Network timeout");
  });

  it("retry from error state re-invokes query fetch", async () => {
    const { flow, query, executeFetch, executeRetry } = createUserListSetup();

    // First fetch fails
    query.setNextResult({ error: new Error("Network timeout") });
    await executeFetch();

    expect(flow.state()).toBe("error");

    // Retry succeeds (next result uses default data)
    await executeRetry();

    expect(flow.state()).toBe("loaded");
    expect(flow.context().users).toHaveLength(2);
    expect(flow.context().errorMessage).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pattern 2: Machine Effect Invalidates Query
// ---------------------------------------------------------------------------

describe("Query + Flow: Machine Effect Invalidates Query", () => {
  it("machine invalidates query cache after successful mutation", async () => {
    const queryClient = createFakeQueryClientAdapter();
    const mutation = createFakeMutationAdapter<User, { name: string; email: string }>({
      name: "CreateUser",
      data: { id: "3", name: "Charlie", email: "charlie@example.com" },
    });

    type CreateUserState = "editing" | "submitting" | "success";
    type CreateUserEvent = "SUBMIT" | "MUTATION_SUCCESS" | "MUTATION_ERROR" | "RESET";

    const createUserMachine: MockMachineDefinition<
      CreateUserState,
      CreateUserEvent,
      { createdUser: User | null }
    > = {
      id: "createUser",
      initial: "editing",
      context: { createdUser: null },
      states: {
        editing: { on: { SUBMIT: "submitting" } },
        submitting: {
          on: {
            MUTATION_SUCCESS: "success",
            MUTATION_ERROR: "editing",
          },
        },
        success: { on: { RESET: "editing" } },
      },
    };

    const flow = createMockFlowService({ machine: createUserMachine });

    // Simulate: transition to submitting, execute mutation, invalidate cache
    flow.send("SUBMIT");

    const user = await mutation.execute({ name: "Charlie", email: "charlie@example.com" });
    flow.setContext(() => ({ createdUser: user }));
    flow.send("MUTATION_SUCCESS");

    // Invalidate cache after mutation success
    await queryClient.invalidate("Users");

    expect(flow.state()).toBe("success");
    expect(flow.context().createdUser).toEqual({
      id: "3",
      name: "Charlie",
      email: "charlie@example.com",
    });
    expect(queryClient.getInvalidationsFor("Users")).toHaveLength(1);
  });

  it("invalidated query is refetched on next mount", async () => {
    const queryClient = createFakeQueryClientAdapter();
    const query = createFakeQueryAdapter<readonly User[]>({
      name: "Users",
      data: [{ id: "1", name: "Alice", email: "alice@example.com" }],
    });

    // Invalidate the cache
    await queryClient.invalidate("Users");

    // Next "mount" triggers a refetch
    const data = await query.fetch();

    expect(data).toHaveLength(1);
    expect(query.fetchCalls).toHaveLength(1);
    expect(queryClient.getInvalidationsFor("Users")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Pattern 3: Query State Drives Machine Transitions
// ---------------------------------------------------------------------------

describe("Query + Flow: Query State Drives Machine Transitions", () => {
  type DashboardState = "idle" | "observing";
  type DashboardEvent =
    | "ACTIVATE"
    | "QUERY_LOADING"
    | "QUERY_SUCCESS"
    | "QUERY_ERROR"
    | "DEACTIVATE";

  interface DashboardContext {
    readonly users: readonly User[];
    readonly isLoading: boolean;
    readonly errorMessage: string | null;
  }

  const dashboardMachine: MockMachineDefinition<DashboardState, DashboardEvent, DashboardContext> =
    {
      id: "dashboard",
      initial: "idle",
      context: {
        users: [],
        isLoading: false,
        errorMessage: null,
      },
      states: {
        idle: { on: { ACTIVATE: "observing" } },
        observing: {
          on: {
            QUERY_LOADING: "observing",
            QUERY_SUCCESS: "observing",
            QUERY_ERROR: "observing",
            DEACTIVATE: "idle",
          },
        },
      },
    };

  function createDashboardSetup() {
    const query = createFakeQueryAdapter<readonly User[]>({
      name: "Users",
      data: [
        { id: "1", name: "Alice", email: "alice@example.com" },
        { id: "2", name: "Bob", email: "bob@example.com" },
      ],
    });

    const flow = createMockFlowService({ machine: dashboardMachine });

    return { query, flow };
  }

  it("activity subscribes to query port and emits QUERY_LOADING event", () => {
    const { query, flow } = createDashboardSetup();
    flow.send("ACTIVATE");

    const events: string[] = [];
    query.subscribe(state => {
      if (state.status === "loading") {
        events.push("QUERY_LOADING");
        flow.send("QUERY_LOADING");
        flow.setContext(ctx => ({ ...ctx, isLoading: true }));
      }
    });

    // Start fetching (triggers loading state)
    void query.fetch();

    expect(events).toContain("QUERY_LOADING");
    expect(flow.context().isLoading).toBe(true);
  });

  it("activity emits QUERY_SUCCESS with data on successful fetch", async () => {
    const { query, flow } = createDashboardSetup();
    flow.send("ACTIVATE");

    query.subscribe(state => {
      if (state.status === "success" && state.data) {
        flow.send("QUERY_SUCCESS");
        flow.setContext(ctx => ({
          ...ctx,
          users: state.data ?? [],
          isLoading: false,
        }));
      }
    });

    await query.fetch();

    expect(flow.state()).toBe("observing");
    expect(flow.context().users).toHaveLength(2);
    expect(flow.context().isLoading).toBe(false);
  });

  it("activity emits QUERY_ERROR on fetch failure", async () => {
    const { flow } = createDashboardSetup();
    flow.send("ACTIVATE");

    const failingQuery = createFakeQueryAdapter<readonly User[], void>({
      name: "Users",
      error: new Error("Server error"),
    });

    failingQuery.subscribe(state => {
      if (state.status === "error") {
        flow.send("QUERY_ERROR");
        flow.setContext(ctx => ({
          ...ctx,
          errorMessage: "Server error",
          isLoading: false,
        }));
      }
    });

    await expect(failingQuery.fetch()).rejects.toThrow("Server error");

    expect(flow.state()).toBe("observing");
    expect(flow.context().errorMessage).toBe("Server error");
    expect(flow.context().isLoading).toBe(false);
  });

  it("activity is cancelled via AbortSignal when machine exits observing state", async () => {
    const { query, flow } = createDashboardSetup();
    flow.send("ACTIVATE");

    const controller = new AbortController();
    let activityRunning = true;

    const unsub = query.subscribe(state => {
      if (controller.signal.aborted) return;
      if (state.status === "success" && state.data) {
        flow.send("QUERY_SUCCESS");
        flow.setContext(ctx => ({ ...ctx, users: state.data ?? [] }));
      }
    });

    controller.signal.addEventListener("abort", () => {
      unsub();
      activityRunning = false;
    });

    // Fetch while activity is running
    await query.fetch();
    expect(flow.context().users).toHaveLength(2);

    // Machine exits observing state -> activity cancelled
    flow.send("DEACTIVATE");
    controller.abort();

    expect(activityRunning).toBe(false);
    expect(flow.state()).toBe("idle");

    // Query changes after abort should NOT affect machine
    query.reset();
    await query.fetch();

    // Machine state unchanged from before deactivation
    expect(flow.state()).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// Anti-Patterns
// ---------------------------------------------------------------------------

describe("Query + Flow: Anti-Patterns", () => {
  it("polling via Effect.delay instead of refetchInterval is detected as anti-pattern", async () => {
    const query = createFakeQueryAdapter<readonly User[]>({
      name: "Users",
      data: [{ id: "1", name: "Alice", email: "alice@example.com" }],
    });

    // Anti-pattern: manually polling with setTimeout in a machine effect
    let pollCount = 0;
    const maxPolls = 3;

    const pollWithDelay = async () => {
      while (pollCount < maxPolls) {
        await query.fetch();
        pollCount++;
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    };

    await pollWithDelay();

    // Multiple manual fetches occurred (anti-pattern)
    expect(query.fetchCalls).toHaveLength(maxPolls);

    // CORRECT: configure refetchInterval on the query port defaults:
    // createQueryPort({ name: "Users", defaults: { refetchInterval: 5000 } })
    // The query layer handles the polling automatically, not the machine.
    expect(pollCount).toBe(maxPolls);
  });

  it("storing query data in machine context long-term diverges from cache", async () => {
    const query = createFakeQueryAdapter<readonly User[], void>({
      name: "Users",
      sequence: [
        { data: [{ id: "1", name: "Alice v1", email: "a@v1.com" }] },
        { data: [{ id: "1", name: "Alice v2", email: "a@v2.com" }] },
      ],
    });

    type LoadedState = "loaded";
    type LoadedEvent = never;

    const loadedMachine: MockMachineDefinition<
      LoadedState,
      LoadedEvent,
      {
        users: readonly User[];
      }
    > = {
      id: "userList",
      initial: "loaded",
      context: {
        users: [],
      },
      states: {
        loaded: { on: {} },
      },
    };

    const flow = createMockFlowService({ machine: loadedMachine });

    // First fetch: copy data into context
    const data1 = await query.fetch();
    flow.setContext(() => ({ users: data1 }));

    expect(flow.context().users[0].name).toBe("Alice v1");

    // Query cache updates with new data
    const data2 = await query.fetch();

    // Machine context is now stale
    expect(flow.context().users[0].name).toBe("Alice v1"); // Stale!
    expect(data2[0].name).toBe("Alice v2"); // Cache has new data

    // Context and cache have diverged
    expect(flow.context().users[0].name).not.toBe(data2[0].name);
  });
});
