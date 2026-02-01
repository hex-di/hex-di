/**
 * Request scope unit tests.
 *
 * Tests for the createRequestScope method and request lifetime behavior.
 * Request scopes provide HTTP request isolation where services with 'request'
 * lifetime are created once per request and cached within that request.
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { DisposedScopeError } from "../src/errors/index.js";
import { resetRequestScopeIdCounter } from "../src/scope/request-scope.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
  name: string;
}

interface RequestContext {
  requestId: string;
  startTime: number;
}

interface UserContext {
  userId: string;
}

interface Database {
  query(sql: string): unknown;
  connectionId: string;
}

interface TransactionManager {
  beginTransaction(): void;
  commit(): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const RequestContextPort = createPort<"RequestContext", RequestContext>("RequestContext");
const UserContextPort = createPort<"UserContext", UserContext>("UserContext");
const _DatabasePort = createPort<"Database", Database>("Database");
const TransactionPort = createPort<"Transaction", TransactionManager>("Transaction");

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  resetRequestScopeIdCounter();
});

// =============================================================================
// Request Scope Creation Tests
// =============================================================================

describe("createRequestScope", () => {
  test("returns a frozen Scope object", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Logger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });
    const requestScope = container.createRequestScope();

    expect(Object.isFrozen(requestScope)).toBe(true);
  });

  test("request scope has resolve, createScope, dispose methods", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Logger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });
    const requestScope = container.createRequestScope();

    expect(typeof requestScope.resolve).toBe("function");
    expect(typeof requestScope.createScope).toBe("function");
    expect(typeof requestScope.dispose).toBe("function");
  });

  test("accepts optional name parameter", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Logger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const namedScope = container.createRequestScope("my-request");
    expect(namedScope).toBeDefined();

    const autoNamedScope = container.createRequestScope();
    expect(autoNamedScope).toBeDefined();
  });
});

// =============================================================================
// Request-Scoped Service Tests
// =============================================================================

describe("request-scoped services", () => {
  test("request-scoped services are created fresh per request", () => {
    const factory = vi.fn(() => ({
      requestId: Math.random().toString(36).slice(2),
      startTime: Date.now(),
    }));

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "request",
      factory,
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Create two request scopes
    const request1 = container.createRequestScope("request-1");
    const request2 = container.createRequestScope("request-2");

    const ctx1 = request1.resolve(RequestContextPort);
    const ctx2 = request2.resolve(RequestContextPort);

    // Should be different instances
    expect(ctx1).not.toBe(ctx2);
    expect(ctx1.requestId).not.toBe(ctx2.requestId);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  test("request-scoped services are cached within request", () => {
    const factory = vi.fn(() => ({
      requestId: Math.random().toString(36).slice(2),
      startTime: Date.now(),
    }));

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "request",
      factory,
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();

    const first = requestScope.resolve(RequestContextPort);
    const second = requestScope.resolve(RequestContextPort);

    // Same instance within request
    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  test("request scope instances are isolated between requests", () => {
    interface CounterService {
      count: number;
      increment(): void;
    }

    const CounterPort = createPort<"Counter", CounterService>("Counter");

    const CounterAdapter = createAdapter({
      provides: CounterPort,
      requires: [],
      lifetime: "request",
      factory: () => ({
        count: 0,
        increment() {
          this.count++;
        },
      }),
    });

    const graph = GraphBuilder.create().provide(CounterAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const request1 = container.createRequestScope();
    const request2 = container.createRequestScope();

    // Increment counter in request1
    const counter1 = request1.resolve(CounterPort);
    counter1.increment();
    counter1.increment();

    // Request2 should have fresh counter
    const counter2 = request2.resolve(CounterPort);
    expect(counter2.count).toBe(0);

    // Request1 counter should still be incremented
    expect(counter1.count).toBe(2);
  });
});

// =============================================================================
// Lifetime Hierarchy Tests
// =============================================================================

describe("request scope lifetime hierarchy", () => {
  test("singleton is shared across request scopes", () => {
    const singletonFactory = vi.fn(() => ({ log: vi.fn(), name: "SharedLogger" }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: singletonFactory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const request1 = container.createRequestScope();
    const request2 = container.createRequestScope();

    const logger1 = request1.resolve(LoggerPort);
    const logger2 = request2.resolve(LoggerPort);
    const containerLogger = container.resolve(LoggerPort);

    // All should be the same singleton instance
    expect(logger1).toBe(logger2);
    expect(logger1).toBe(containerLogger);
    expect(singletonFactory).toHaveBeenCalledTimes(1);
  });

  test("scoped services are cached within request scope", () => {
    const scopedFactory = vi.fn(() => ({ userId: Math.random().toString() }));

    const UserContextAdapter = createAdapter({
      provides: UserContextPort,
      requires: [],
      lifetime: "scoped",
      factory: scopedFactory,
    });

    const graph = GraphBuilder.create().provide(UserContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();

    const first = requestScope.resolve(UserContextPort);
    const second = requestScope.resolve(UserContextPort);

    // Same instance within request scope
    expect(first).toBe(second);
    expect(scopedFactory).toHaveBeenCalledTimes(1);
  });

  test("scoped services are different between request scopes", () => {
    const scopedFactory = vi.fn(() => ({ userId: Math.random().toString() }));

    const UserContextAdapter = createAdapter({
      provides: UserContextPort,
      requires: [],
      lifetime: "scoped",
      factory: scopedFactory,
    });

    const graph = GraphBuilder.create().provide(UserContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const request1 = container.createRequestScope();
    const request2 = container.createRequestScope();

    const user1 = request1.resolve(UserContextPort);
    const user2 = request2.resolve(UserContextPort);

    // Different instances between request scopes
    expect(user1).not.toBe(user2);
    expect(scopedFactory).toHaveBeenCalledTimes(2);
  });

  test("transient services are fresh on each resolve", () => {
    const transientFactory = vi.fn(() => ({
      requestId: Math.random().toString(),
      startTime: Date.now(),
    }));

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "transient",
      factory: transientFactory,
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();

    const first = requestScope.resolve(RequestContextPort);
    const second = requestScope.resolve(RequestContextPort);

    // Different instances even within same request
    expect(first).not.toBe(second);
    expect(transientFactory).toHaveBeenCalledTimes(2);
  });

  test("mixing request/scoped/singleton lifetimes works correctly", () => {
    const singletonFactory = vi.fn(() => ({ log: vi.fn(), name: "Logger" }));
    const scopedFactory = vi.fn(() => ({ userId: Math.random().toString() }));
    const requestFactory = vi.fn(() => ({
      requestId: Math.random().toString(),
      startTime: Date.now(),
    }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: singletonFactory,
    });

    const UserContextAdapter = createAdapter({
      provides: UserContextPort,
      requires: [],
      lifetime: "scoped",
      factory: scopedFactory,
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "request",
      factory: requestFactory,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(UserContextAdapter)
      .provide(RequestContextAdapter)
      .build();

    const container = createContainer(graph, { name: "Test" });

    const request1 = container.createRequestScope();
    const request2 = container.createRequestScope();

    // Resolve all from both requests
    const logger1 = request1.resolve(LoggerPort);
    const user1 = request1.resolve(UserContextPort);
    const ctx1 = request1.resolve(RequestContextPort);

    const logger2 = request2.resolve(LoggerPort);
    const user2 = request2.resolve(UserContextPort);
    const ctx2 = request2.resolve(RequestContextPort);

    // Singleton shared
    expect(logger1).toBe(logger2);

    // Scoped and request are different between scopes
    expect(user1).not.toBe(user2);
    expect(ctx1).not.toBe(ctx2);

    // Factory call counts
    expect(singletonFactory).toHaveBeenCalledTimes(1);
    expect(scopedFactory).toHaveBeenCalledTimes(2);
    expect(requestFactory).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// Request Scope Disposal Tests
// =============================================================================

describe("request scope disposal", () => {
  test("disposal cleans up request-scoped instances", async () => {
    const finalizerFn = vi.fn();

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ requestId: "123", startTime: Date.now() }),
      finalizer: finalizerFn,
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();
    requestScope.resolve(RequestContextPort);

    await requestScope.dispose();

    expect(finalizerFn).toHaveBeenCalledTimes(1);
  });

  test("disposal cleans up scoped instances within request scope", async () => {
    const scopedFinalizer = vi.fn();

    const UserContextAdapter = createAdapter({
      provides: UserContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ userId: "user-123" }),
      finalizer: scopedFinalizer,
    });

    const graph = GraphBuilder.create().provide(UserContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();
    requestScope.resolve(UserContextPort);

    await requestScope.dispose();

    expect(scopedFinalizer).toHaveBeenCalledTimes(1);
  });

  test("disposal does not affect singleton instances", async () => {
    const singletonFinalizer = vi.fn();
    const requestFinalizer = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Logger" }),
      finalizer: singletonFinalizer,
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ requestId: "123", startTime: Date.now() }),
      finalizer: requestFinalizer,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();

    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();
    requestScope.resolve(LoggerPort);
    requestScope.resolve(RequestContextPort);

    await requestScope.dispose();

    // Request finalizer called
    expect(requestFinalizer).toHaveBeenCalledTimes(1);
    // Singleton finalizer NOT called (owned by container)
    expect(singletonFinalizer).not.toHaveBeenCalled();

    // Singleton still resolvable from container
    const logger = container.resolve(LoggerPort);
    expect(logger.name).toBe("Logger");
  });

  test("resolve throws DisposedScopeError after disposal", async () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ requestId: "123", startTime: Date.now() }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();
    await requestScope.dispose();

    expect(() => requestScope.resolve(RequestContextPort)).toThrow(DisposedScopeError);
  });

  test("isDisposed reflects disposal state", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Logger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();

    expect(requestScope.isDisposed).toBe(false);
    await requestScope.dispose();
    expect(requestScope.isDisposed).toBe(true);
  });
});

// =============================================================================
// Child Request Scope Tests
// =============================================================================

describe("request scope nesting", () => {
  test("request scope can create child scopes", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Logger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();
    const childScope = requestScope.createScope("child");

    expect(childScope).toBeDefined();
    expect(typeof childScope.resolve).toBe("function");
  });

  test("child scopes inherit singletons from request scope", () => {
    const singletonFactory = vi.fn(() => ({ log: vi.fn(), name: "Logger" }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: singletonFactory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();
    const childScope = requestScope.createScope();

    const parentLogger = requestScope.resolve(LoggerPort);
    const childLogger = childScope.resolve(LoggerPort);

    expect(childLogger).toBe(parentLogger);
    expect(singletonFactory).toHaveBeenCalledTimes(1);
  });

  test("disposing request scope disposes child scopes", async () => {
    const childFinalizer = vi.fn();

    const UserContextAdapter = createAdapter({
      provides: UserContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ userId: "user-123" }),
      finalizer: childFinalizer,
    });

    const graph = GraphBuilder.create().provide(UserContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();
    const childScope = requestScope.createScope();

    childScope.resolve(UserContextPort);

    await requestScope.dispose();

    // Child finalizer should be called
    expect(childFinalizer).toHaveBeenCalled();
    expect(childScope.isDisposed).toBe(true);
  });
});

// =============================================================================
// Request Scope Lifecycle Events Tests
// =============================================================================

describe("request scope lifecycle events", () => {
  test("subscribe receives disposing event", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Logger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();

    const events: string[] = [];
    requestScope.subscribe(event => {
      events.push(event);
    });

    await requestScope.dispose();

    expect(events).toContain("disposing");
    expect(events).toContain("disposed");
  });

  test("getDisposalState returns correct state", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Logger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const requestScope = container.createRequestScope();

    expect(requestScope.getDisposalState()).toBe("active");

    await requestScope.dispose();

    expect(requestScope.getDisposalState()).toBe("disposed");
  });
});

// =============================================================================
// Request Scope with Dependencies Tests
// =============================================================================

describe("request scope with dependencies", () => {
  test("request-scoped service can depend on singleton", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Logger" }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [LoggerPort],
      lifetime: "request",
      factory: deps => {
        deps.Logger.log("Creating request context");
        return { requestId: Math.random().toString(), startTime: Date.now() };
      },
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();

    const container = createContainer(graph, { name: "Test" });
    const requestScope = container.createRequestScope();

    const ctx = requestScope.resolve(RequestContextPort);
    expect(ctx.requestId).toBeDefined();
  });

  test("request-scoped service can depend on scoped service", () => {
    const UserContextAdapter = createAdapter({
      provides: UserContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ userId: "user-" + Math.random().toString(36).slice(2) }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [UserContextPort],
      lifetime: "request",
      factory: deps => ({
        requestId: `request-for-${deps.UserContext.userId}`,
        startTime: Date.now(),
      }),
    });

    const graph = GraphBuilder.create()
      .provide(UserContextAdapter)
      .provide(RequestContextAdapter)
      .build();

    const container = createContainer(graph, { name: "Test" });
    const requestScope = container.createRequestScope();

    const ctx = requestScope.resolve(RequestContextPort);
    expect(ctx.requestId).toMatch(/^request-for-user-/);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("request scope integration", () => {
  test("simulates HTTP request lifecycle", async () => {
    const requestStarts: string[] = [];
    const requestEnds: string[] = [];

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "request",
      factory: () => {
        const id = Math.random().toString(36).slice(2);
        requestStarts.push(id);
        return { requestId: id, startTime: Date.now() };
      },
      finalizer: ctx => {
        requestEnds.push(ctx.requestId);
      },
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Simulate 3 concurrent requests
    const requests = [
      container.createRequestScope("req-1"),
      container.createRequestScope("req-2"),
      container.createRequestScope("req-3"),
    ];

    // Each request resolves its context
    const contexts = requests.map(req => req.resolve(RequestContextPort));

    // All contexts should be unique
    const ids = new Set(contexts.map(c => c.requestId));
    expect(ids.size).toBe(3);

    // Dispose in reverse order (simulating completion order)
    await requests[2].dispose();
    await requests[0].dispose();
    await requests[1].dispose();

    // All should be tracked
    expect(requestStarts.length).toBe(3);
    expect(requestEnds.length).toBe(3);
  });

  test("database transaction per request pattern", async () => {
    const transactions: string[] = [];
    const commits: string[] = [];

    const TransactionAdapter = createAdapter({
      provides: TransactionPort,
      requires: [],
      lifetime: "request",
      factory: () => {
        const txId = Math.random().toString(36).slice(2);
        transactions.push(txId);
        return {
          beginTransaction: () => {},
          commit: () => {
            commits.push(txId);
          },
          txId, // For tracking
        };
      },
      finalizer: _tx => {
        // Commit on disposal if not already committed
        // Note: In real code, you'd check if committed
      },
    });

    const graph = GraphBuilder.create().provide(TransactionAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Simulate request handling
    const requestScope = container.createRequestScope();
    const tx = requestScope.resolve(TransactionPort);
    tx.beginTransaction();

    // Multiple resolves get same transaction
    const sameTx = requestScope.resolve(TransactionPort);
    expect(sameTx).toBe(tx);

    tx.commit();
    await requestScope.dispose();

    expect(transactions.length).toBe(1);
    expect(commits.length).toBe(1);
  });
});

// =============================================================================
// Child Container Request Scope Tests
// =============================================================================

describe("request scope with child containers", () => {
  test("child container can create request scopes", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Logger" }),
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parent = createContainer(parentGraph, { name: "Parent" });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [LoggerPort],
      lifetime: "request",
      factory: deps => {
        deps.Logger.log("Creating request context");
        return { requestId: "123", startTime: Date.now() };
      },
    });

    // Use buildFragment() since RequestContextAdapter's dependency (Logger) comes from parent
    const childGraph = GraphBuilder.create().provide(RequestContextAdapter).buildFragment();
    const child = parent.createChild(childGraph, { name: "Child" });

    const requestScope = child.createRequestScope();
    const ctx = requestScope.resolve(RequestContextPort);

    expect(ctx.requestId).toBe("123");
  });
});
