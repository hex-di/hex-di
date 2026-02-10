/**
 * Cross-Adapter Integration Tests
 *
 * Tests that real ports, adapters, GraphBuilder, and Container work together
 * across library boundaries. Unlike the mock-based tests, these use the actual
 * DI infrastructure (@hex-di/core, @hex-di/graph, @hex-di/runtime) to verify
 * that adapters from different "libraries" can be composed, resolved, and
 * interact correctly through the container.
 *
 * Patterns tested:
 * 1. Multi-library adapter composition in a single graph
 * 2. Cross-library dependency resolution via PortDeps
 * 3. Scoped lifetime isolation across library boundaries
 * 4. Async adapter initialization with cross-library dependencies
 * 5. Container disposal across library-owned adapters
 * 6. Child container overrides for cross-library adapters
 */

import { describe, it, expect } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// =============================================================================
// Simulated library service interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
  readonly messages: readonly string[];
}

interface StateService<T> {
  get(): T;
  set(value: T): void;
  subscribe(cb: (value: T) => void): () => void;
}

interface QueryService<T> {
  fetch(): Promise<T>;
  readonly lastResult: T | undefined;
}

interface FlowService {
  readonly currentState: string;
  send(event: string): void;
  readonly history: readonly string[];
}

interface SagaService {
  execute(input: unknown): Promise<{ readonly completedSteps: readonly string[] }>;
  readonly executionCount: number;
}

// =============================================================================
// Shared ports (simulating ports defined by different libraries)
// =============================================================================

const LoggerPort = port<Logger>()({ name: "Logger", category: "infrastructure" });

const UserStatePort = port<StateService<{ users: readonly string[] }>>()({
  name: "UserState",
  category: "store",
});

const UserQueryPort = port<QueryService<readonly string[]>>()({
  name: "UserQuery",
  category: "query",
});

const CheckoutFlowPort = port<FlowService>()({
  name: "CheckoutFlow",
  category: "flow",
});

const OrderSagaPort = port<SagaService>()({
  name: "OrderSaga",
  category: "saga",
});

// =============================================================================
// Pattern 1: Multi-library adapter composition in a single graph
// =============================================================================

describe("Cross-Adapter: Multi-library composition in single graph", () => {
  it("graph accepts adapters from different libraries and resolves all ports", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => {
        const messages: string[] = [];
        return {
          log: (msg: string) => messages.push(msg),
          get messages() {
            return [...messages];
          },
        };
      },
    });

    const stateAdapter = createAdapter({
      provides: UserStatePort,
      factory: () => {
        let state = { users: [] as readonly string[] };
        const subs = new Set<(value: { users: readonly string[] }) => void>();
        return {
          get: () => state,
          set: (value: { users: readonly string[] }) => {
            state = value;
            for (const cb of subs) cb(state);
          },
          subscribe: (cb: (value: { users: readonly string[] }) => void) => {
            subs.add(cb);
            return () => subs.delete(cb);
          },
        };
      },
    });

    const queryAdapter = createAdapter({
      provides: UserQueryPort,
      requires: [LoggerPort],
      factory: deps => {
        let lastResult: readonly string[] | undefined;
        return {
          fetch: () => {
            deps.Logger.log("Fetching users");
            const result = ["Alice", "Bob"];
            lastResult = result;
            return Promise.resolve(result);
          },
          get lastResult() {
            return lastResult;
          },
        };
      },
    });

    const graph = GraphBuilder.create()
      .provide(loggerAdapter)
      .provide(stateAdapter)
      .provide(queryAdapter)
      .build();

    const container = createContainer({ graph, name: "multi-library" });

    const logger = container.resolve(LoggerPort);
    const state = container.resolve(UserStatePort);
    const query = container.resolve(UserQueryPort);

    expect(logger).toBeDefined();
    expect(state).toBeDefined();
    expect(query).toBeDefined();

    // Verify they are functional
    logger.log("test");
    expect(logger.messages).toEqual(["test"]);

    state.set({ users: ["Charlie"] });
    expect(state.get().users).toEqual(["Charlie"]);
  });

  it("adapters from 4 different library categories coexist in one graph", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({
        log: () => {},
        messages: [],
      }),
    });

    const stateAdapter = createAdapter({
      provides: UserStatePort,
      factory: () => ({
        get: () => ({ users: [] }),
        set: () => {},
        subscribe: () => () => {},
      }),
    });

    const queryAdapter = createAdapter({
      provides: UserQueryPort,
      requires: [LoggerPort],
      factory: deps => ({
        fetch: () => {
          deps.Logger.log("fetch");
          return Promise.resolve([] as readonly string[]);
        },
        lastResult: undefined,
      }),
    });

    const flowAdapter = createAdapter({
      provides: CheckoutFlowPort,
      requires: [LoggerPort],
      factory: deps => {
        let currentState = "idle";
        const history: string[] = ["idle"];
        return {
          get currentState() {
            return currentState;
          },
          send: (event: string) => {
            deps.Logger.log(`flow: ${event}`);
            currentState = event === "START" ? "processing" : currentState;
            history.push(currentState);
          },
          get history() {
            return [...history];
          },
        };
      },
    });

    const sagaAdapter = createAdapter({
      provides: OrderSagaPort,
      requires: [LoggerPort],
      factory: deps => {
        let executionCount = 0;
        return {
          execute: () => {
            deps.Logger.log("saga: executing");
            executionCount++;
            return Promise.resolve({
              completedSteps: ["validate", "process"] as readonly string[],
            });
          },
          get executionCount() {
            return executionCount;
          },
        };
      },
    });

    const graph = GraphBuilder.create()
      .provide(loggerAdapter)
      .provide(stateAdapter)
      .provide(queryAdapter)
      .provide(flowAdapter)
      .provide(sagaAdapter)
      .build();

    const container = createContainer({ graph, name: "four-libraries" });

    expect(container.resolve(LoggerPort)).toBeDefined();
    expect(container.resolve(UserStatePort)).toBeDefined();
    expect(container.resolve(UserQueryPort)).toBeDefined();
    expect(container.resolve(CheckoutFlowPort)).toBeDefined();
    expect(container.resolve(OrderSagaPort)).toBeDefined();
  });
});

// =============================================================================
// Pattern 2: Cross-library dependency resolution via PortDeps
// =============================================================================

describe("Cross-Adapter: Cross-library dependency resolution", () => {
  it("query adapter resolves logger dependency from infrastructure library", async () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => {
        const messages: string[] = [];
        return {
          log: (msg: string) => messages.push(msg),
          get messages() {
            return [...messages];
          },
        };
      },
    });

    const queryAdapter = createAdapter({
      provides: UserQueryPort,
      requires: [LoggerPort],
      factory: deps => {
        let lastResult: readonly string[] | undefined;
        return {
          fetch: () => {
            deps.Logger.log("UserQuery: fetching");
            const data = ["Alice", "Bob"];
            lastResult = data;
            return Promise.resolve(data);
          },
          get lastResult() {
            return lastResult;
          },
        };
      },
    });

    const graph = GraphBuilder.create().provide(loggerAdapter).provide(queryAdapter).build();

    const container = createContainer({ graph, name: "cross-dep" });

    const query = container.resolve(UserQueryPort);
    const logger = container.resolve(LoggerPort);

    const result = await query.fetch();

    expect(result).toEqual(["Alice", "Bob"]);
    expect(logger.messages).toContain("UserQuery: fetching");
  });

  it("saga adapter depends on both logger and state from different libraries", async () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => {
        const messages: string[] = [];
        return {
          log: (msg: string) => messages.push(msg),
          get messages() {
            return [...messages];
          },
        };
      },
    });

    const stateAdapter = createAdapter({
      provides: UserStatePort,
      factory: () => {
        let state = { users: ["existing-user"] as readonly string[] };
        const subs = new Set<(value: { users: readonly string[] }) => void>();
        return {
          get: () => state,
          set: (value: { users: readonly string[] }) => {
            state = value;
            for (const cb of subs) cb(state);
          },
          subscribe: (cb: (value: { users: readonly string[] }) => void) => {
            subs.add(cb);
            return () => subs.delete(cb);
          },
        };
      },
    });

    const sagaAdapter = createAdapter({
      provides: OrderSagaPort,
      requires: [LoggerPort, UserStatePort],
      factory: deps => {
        let executionCount = 0;
        return {
          execute: () => {
            const users = deps.UserState.get().users;
            deps.Logger.log(`saga: processing for ${users.length} users`);
            executionCount++;
            return Promise.resolve({
              completedSteps: ["readState", "process"] as readonly string[],
            });
          },
          get executionCount() {
            return executionCount;
          },
        };
      },
    });

    const graph = GraphBuilder.create()
      .provide(loggerAdapter)
      .provide(stateAdapter)
      .provide(sagaAdapter)
      .build();

    const container = createContainer({ graph, name: "multi-dep" });

    const saga = container.resolve(OrderSagaPort);
    const logger = container.resolve(LoggerPort);

    await saga.execute({});

    expect(saga.executionCount).toBe(1);
    expect(logger.messages).toContain("saga: processing for 1 users");
  });

  it("flow adapter triggers state update via resolved state dependency", () => {
    const stateAdapter = createAdapter({
      provides: UserStatePort,
      factory: () => {
        let state = { users: [] as readonly string[] };
        const subs = new Set<(value: { users: readonly string[] }) => void>();
        return {
          get: () => state,
          set: (value: { users: readonly string[] }) => {
            state = value;
            for (const cb of subs) cb(state);
          },
          subscribe: (cb: (value: { users: readonly string[] }) => void) => {
            subs.add(cb);
            return () => subs.delete(cb);
          },
        };
      },
    });

    const flowAdapter = createAdapter({
      provides: CheckoutFlowPort,
      requires: [UserStatePort],
      factory: deps => {
        let currentState = "idle";
        const history: string[] = ["idle"];
        return {
          get currentState() {
            return currentState;
          },
          send: (event: string) => {
            if (event === "ADD_USER") {
              const current = deps.UserState.get();
              deps.UserState.set({ users: [...current.users, "NewUser"] });
              currentState = "user-added";
            } else {
              currentState = event;
            }
            history.push(currentState);
          },
          get history() {
            return [...history];
          },
        };
      },
    });

    const graph = GraphBuilder.create().provide(stateAdapter).provide(flowAdapter).build();

    const container = createContainer({ graph, name: "flow-state" });

    const flow = container.resolve(CheckoutFlowPort);
    const state = container.resolve(UserStatePort);

    flow.send("ADD_USER");

    expect(state.get().users).toEqual(["NewUser"]);
    expect(flow.currentState).toBe("user-added");
  });
});

// =============================================================================
// Pattern 3: Scoped lifetime isolation across library boundaries
// =============================================================================

describe("Cross-Adapter: Scoped lifetime isolation", () => {
  it("scoped adapters get fresh instances per scope while singletons are shared", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      lifetime: "singleton",
      factory: () => {
        const messages: string[] = [];
        return {
          log: (msg: string) => messages.push(msg),
          get messages() {
            return [...messages];
          },
        };
      },
    });

    const stateAdapter = createAdapter({
      provides: UserStatePort,
      lifetime: "scoped",
      factory: () => {
        let state = { users: [] as readonly string[] };
        const subs = new Set<(value: { users: readonly string[] }) => void>();
        return {
          get: () => state,
          set: (value: { users: readonly string[] }) => {
            state = value;
            for (const cb of subs) cb(state);
          },
          subscribe: (cb: (value: { users: readonly string[] }) => void) => {
            subs.add(cb);
            return () => subs.delete(cb);
          },
        };
      },
    });

    const graph = GraphBuilder.create().provide(loggerAdapter).provide(stateAdapter).build();

    const container = createContainer({ graph, name: "scoped-test" });
    const scope1 = container.createScope();
    const scope2 = container.createScope();

    // Singleton logger is shared
    const logger1 = scope1.resolve(LoggerPort);
    const logger2 = scope2.resolve(LoggerPort);
    expect(logger1).toBe(logger2);

    // Scoped state is isolated
    const state1 = scope1.resolve(UserStatePort);
    const state2 = scope2.resolve(UserStatePort);
    expect(state1).not.toBe(state2);

    // Mutations in one scope don't affect the other
    state1.set({ users: ["Alice"] });
    expect(state1.get().users).toEqual(["Alice"]);
    expect(state2.get().users).toEqual([]);
  });

  it("scoped cross-library adapter uses singleton from another library", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      lifetime: "singleton",
      factory: () => {
        const messages: string[] = [];
        return {
          log: (msg: string) => messages.push(msg),
          get messages() {
            return [...messages];
          },
        };
      },
    });

    const queryAdapter = createAdapter({
      provides: UserQueryPort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: deps => {
        let lastResult: readonly string[] | undefined;
        return {
          fetch: () => {
            deps.Logger.log("scoped query fetch");
            const data = ["scoped-data"];
            lastResult = data;
            return Promise.resolve(data);
          },
          get lastResult() {
            return lastResult;
          },
        };
      },
    });

    const graph = GraphBuilder.create().provide(loggerAdapter).provide(queryAdapter).build();

    const container = createContainer({ graph, name: "scoped-cross" });
    const scope1 = container.createScope();
    const scope2 = container.createScope();

    const query1 = scope1.resolve(UserQueryPort);
    const query2 = scope2.resolve(UserQueryPort);

    // Different query instances per scope
    expect(query1).not.toBe(query2);

    // But both use the same logger singleton
    const logger = container.resolve(LoggerPort);
    void query1.fetch();
    void query2.fetch();

    // Both fetches logged to the same logger instance
    expect(logger.messages.filter(m => m === "scoped query fetch").length).toBe(2);
  });
});

// =============================================================================
// Pattern 4: Async adapter initialization with cross-library deps
// =============================================================================

describe("Cross-Adapter: Async adapter initialization", () => {
  it("async query adapter resolves via resolveAsync with logger dependency", async () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => {
        const messages: string[] = [];
        return {
          log: (msg: string) => messages.push(msg),
          get messages() {
            return [...messages];
          },
        };
      },
    });

    const queryAdapter = createAdapter({
      provides: UserQueryPort,
      requires: [LoggerPort],
      factory: async deps => {
        deps.Logger.log("UserQuery: initializing async");
        // Simulate async initialization (e.g., connection pool setup)
        await new Promise(resolve => setTimeout(resolve, 5));
        deps.Logger.log("UserQuery: ready");

        let lastResult: readonly string[] | undefined;
        return {
          fetch: () => {
            deps.Logger.log("UserQuery: fetching");
            const data = ["async-alice", "async-bob"];
            lastResult = data;
            return Promise.resolve(data);
          },
          get lastResult() {
            return lastResult;
          },
        };
      },
    });

    const graph = GraphBuilder.create().provide(loggerAdapter).provide(queryAdapter).build();

    const container = createContainer({ graph, name: "async-init" });

    // Async adapters must be resolved via resolveAsync
    const query = await container.resolveAsync(UserQueryPort);
    const logger = container.resolve(LoggerPort);

    expect(logger.messages).toContain("UserQuery: initializing async");
    expect(logger.messages).toContain("UserQuery: ready");

    const result = await query.fetch();
    expect(result).toEqual(["async-alice", "async-bob"]);
    expect(logger.messages).toContain("UserQuery: fetching");
  });
});

// =============================================================================
// Pattern 5: Container disposal across library-owned adapters
// =============================================================================

describe("Cross-Adapter: Container disposal", () => {
  it("disposing container calls finalizers on adapters from all libraries", async () => {
    const disposed: string[] = [];

    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({
        log: () => {},
        messages: [],
      }),
      finalizer: () => {
        disposed.push("logger");
      },
    });

    const stateAdapter = createAdapter({
      provides: UserStatePort,
      factory: () => ({
        get: () => ({ users: [] }),
        set: () => {},
        subscribe: () => () => {},
      }),
      finalizer: () => {
        disposed.push("state");
      },
    });

    const queryAdapter = createAdapter({
      provides: UserQueryPort,
      requires: [LoggerPort],
      factory: deps => ({
        fetch: () => {
          deps.Logger.log("fetch");
          return Promise.resolve([] as readonly string[]);
        },
        lastResult: undefined,
      }),
      finalizer: () => {
        disposed.push("query");
      },
    });

    const graph = GraphBuilder.create()
      .provide(loggerAdapter)
      .provide(stateAdapter)
      .provide(queryAdapter)
      .build();

    const container = createContainer({ graph, name: "disposal-test" });

    // Force resolution so instances exist
    container.resolve(LoggerPort);
    container.resolve(UserStatePort);
    container.resolve(UserQueryPort);

    await container.dispose();

    // All finalizers were called
    expect(disposed).toContain("logger");
    expect(disposed).toContain("state");
    expect(disposed).toContain("query");
    expect(disposed).toHaveLength(3);
  });

  it("scope disposal calls scoped finalizers without affecting singletons", async () => {
    const disposed: string[] = [];

    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      lifetime: "singleton",
      factory: () => ({
        log: () => {},
        messages: [],
      }),
      finalizer: () => {
        disposed.push("logger");
      },
    });

    const stateAdapter = createAdapter({
      provides: UserStatePort,
      lifetime: "scoped",
      factory: () => ({
        get: () => ({ users: [] }),
        set: () => {},
        subscribe: () => () => {},
      }),
      finalizer: () => {
        disposed.push("state");
      },
    });

    const graph = GraphBuilder.create().provide(loggerAdapter).provide(stateAdapter).build();

    const container = createContainer({ graph, name: "scope-disposal" });
    const scope = container.createScope();

    scope.resolve(LoggerPort);
    scope.resolve(UserStatePort);

    await scope.dispose();

    // Only scoped adapter finalized
    expect(disposed).toContain("state");
    expect(disposed).not.toContain("logger");
  });
});

// =============================================================================
// Pattern 6: Child container overrides for cross-library adapters
// =============================================================================

describe("Cross-Adapter: Child container overrides", () => {
  it("child container can override a single library adapter while keeping others", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => {
        const messages: string[] = [];
        return {
          log: (msg: string) => messages.push(msg),
          get messages() {
            return [...messages];
          },
        };
      },
    });

    const queryAdapter = createAdapter({
      provides: UserQueryPort,
      requires: [LoggerPort],
      factory: deps => ({
        fetch: () => {
          deps.Logger.log("production query");
          return Promise.resolve(["prod-data"] as readonly string[]);
        },
        lastResult: undefined,
      }),
    });

    const graph = GraphBuilder.create().provide(loggerAdapter).provide(queryAdapter).build();

    const parent = createContainer({ graph, name: "parent" });

    // Override only the query adapter in the child via OverrideBuilder
    const testQueryAdapter = createAdapter({
      provides: UserQueryPort,
      requires: [LoggerPort],
      factory: deps => ({
        fetch: () => {
          deps.Logger.log("test query");
          return Promise.resolve(["test-data"] as readonly string[]);
        },
        lastResult: undefined,
      }),
    });

    const child = parent.override(testQueryAdapter).build();

    const parentQuery = parent.resolve(UserQueryPort);
    const childQuery = child.resolve(UserQueryPort);

    // Parent and child resolve different query implementations
    expect(parentQuery).not.toBe(childQuery);

    // But share the same logger
    const parentLogger = parent.resolve(LoggerPort);
    const childLogger = child.resolve(LoggerPort);
    expect(parentLogger).toBe(childLogger);
  });
});

// =============================================================================
// Pattern 7: End-to-end cross-library workflow
// =============================================================================

describe("Cross-Adapter: End-to-end workflow", () => {
  it("full workflow: flow triggers query, query updates state, saga reads state", async () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => {
        const messages: string[] = [];
        return {
          log: (msg: string) => messages.push(msg),
          get messages() {
            return [...messages];
          },
        };
      },
    });

    const stateAdapter = createAdapter({
      provides: UserStatePort,
      factory: () => {
        let state = { users: [] as readonly string[] };
        const subs = new Set<(value: { users: readonly string[] }) => void>();
        return {
          get: () => state,
          set: (value: { users: readonly string[] }) => {
            state = value;
            for (const cb of subs) cb(state);
          },
          subscribe: (cb: (value: { users: readonly string[] }) => void) => {
            subs.add(cb);
            return () => subs.delete(cb);
          },
        };
      },
    });

    const queryAdapter = createAdapter({
      provides: UserQueryPort,
      requires: [LoggerPort, UserStatePort],
      factory: deps => {
        let lastResult: readonly string[] | undefined;
        return {
          fetch: () => {
            deps.Logger.log("query: fetching");
            const data = ["Alice", "Bob", "Charlie"];
            lastResult = data;
            // Sync fetched data into state
            deps.UserState.set({ users: data });
            deps.Logger.log("query: synced to state");
            return Promise.resolve(data);
          },
          get lastResult() {
            return lastResult;
          },
        };
      },
    });

    const flowAdapter = createAdapter({
      provides: CheckoutFlowPort,
      requires: [LoggerPort, UserQueryPort],
      factory: deps => {
        let currentState = "idle";
        const history: string[] = ["idle"];
        return {
          get currentState() {
            return currentState;
          },
          send: (event: string) => {
            deps.Logger.log(`flow: ${event}`);
            if (event === "LOAD") {
              currentState = "loading";
              // Trigger query fetch (fire-and-forget)
              void deps.UserQuery.fetch().then(() => {
                currentState = "loaded";
                history.push("loaded");
              });
            } else {
              currentState = event;
            }
            history.push(currentState);
          },
          get history() {
            return [...history];
          },
        };
      },
    });

    const sagaAdapter = createAdapter({
      provides: OrderSagaPort,
      requires: [LoggerPort, UserStatePort],
      factory: deps => {
        let executionCount = 0;
        return {
          execute: () => {
            const users = deps.UserState.get().users;
            deps.Logger.log(`saga: executing for ${users.length} users`);
            executionCount++;
            return Promise.resolve({
              completedSteps: ["validate", "process", "complete"] as readonly string[],
            });
          },
          get executionCount() {
            return executionCount;
          },
        };
      },
    });

    const graph = GraphBuilder.create()
      .provide(loggerAdapter)
      .provide(stateAdapter)
      .provide(queryAdapter)
      .provide(flowAdapter)
      .provide(sagaAdapter)
      .build();

    const container = createContainer({ graph, name: "e2e-workflow" });

    const flow = container.resolve(CheckoutFlowPort);
    const query = container.resolve(UserQueryPort);
    const state = container.resolve(UserStatePort);
    const saga = container.resolve(OrderSagaPort);
    const logger = container.resolve(LoggerPort);

    // Step 1: Flow triggers query
    flow.send("LOAD");
    expect(logger.messages).toContain("flow: LOAD");

    // Step 2: Query fetches and syncs to state
    await query.fetch();
    expect(state.get().users).toEqual(["Alice", "Bob", "Charlie"]);
    expect(logger.messages).toContain("query: synced to state");

    // Step 3: Saga reads state populated by query
    const sagaResult = await saga.execute({});
    expect(sagaResult.completedSteps).toEqual(["validate", "process", "complete"]);
    expect(logger.messages).toContain("saga: executing for 3 users");

    // Verify full trace through logger
    expect(logger.messages.length).toBeGreaterThanOrEqual(4);
  });

  it("singleton identity: all libraries share the same logger instance", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => {
        const messages: string[] = [];
        return {
          log: (msg: string) => messages.push(msg),
          get messages() {
            return [...messages];
          },
        };
      },
    });

    const queryAdapter = createAdapter({
      provides: UserQueryPort,
      requires: [LoggerPort],
      factory: deps => ({
        fetch: () => {
          deps.Logger.log("from-query");
          return Promise.resolve([] as readonly string[]);
        },
        lastResult: undefined,
      }),
    });

    const flowAdapter = createAdapter({
      provides: CheckoutFlowPort,
      requires: [LoggerPort],
      factory: deps => ({
        currentState: "idle",
        send: (event: string) => deps.Logger.log(`from-flow: ${event}`),
        history: [],
      }),
    });

    const sagaAdapter = createAdapter({
      provides: OrderSagaPort,
      requires: [LoggerPort],
      factory: deps => ({
        execute: () => {
          deps.Logger.log("from-saga");
          return Promise.resolve({ completedSteps: [] as readonly string[] });
        },
        executionCount: 0,
      }),
    });

    const graph = GraphBuilder.create()
      .provide(loggerAdapter)
      .provide(queryAdapter)
      .provide(flowAdapter)
      .provide(sagaAdapter)
      .build();

    const container = createContainer({ graph, name: "singleton-identity" });

    const logger = container.resolve(LoggerPort);
    const query = container.resolve(UserQueryPort);
    const flow = container.resolve(CheckoutFlowPort);
    const saga = container.resolve(OrderSagaPort);

    void query.fetch();
    flow.send("START");
    void saga.execute({});

    // All messages accumulated in the same logger
    expect(logger.messages).toContain("from-query");
    expect(logger.messages).toContain("from-flow: START");
    expect(logger.messages).toContain("from-saga");
  });
});
