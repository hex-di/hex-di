/**
 * Contract Tests for Test Doubles
 *
 * These tests verify that test doubles (mocks, stubs) implement the same
 * interface contracts as the production code they replace. This ensures
 * that tests using mocks remain valid when production interfaces change.
 *
 * ## Why Contract Tests?
 *
 * 1. **Interface Drift Detection**: Catches when production interfaces change
 *    but mocks aren't updated
 * 2. **Mock Quality Assurance**: Verifies mocks behave like real implementations
 * 3. **Documentation**: Shows expected behavior of interfaces
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import {
  createMockLogger,
  createMockDatabase,
  createMockCache,
  createMockConfig,
  createCallTracker,
  createCallSequenceTracker,
} from "./test-doubles.js";

// =============================================================================
// Logger Contract Tests
// =============================================================================

describe("contract: createMockLogger", () => {
  it("mock implements log method", () => {
    const mock = createMockLogger();

    // Verify the method exists and is callable
    expect(typeof mock.implementation.log).toBe("function");

    // Verify it accepts a string argument
    expect(() => mock.implementation.log("test message")).not.toThrow();
  });

  it("mock implements error method", () => {
    const mock = createMockLogger();

    expect(typeof mock.implementation.error).toBe("function");
    expect(() => mock.implementation.error("test error")).not.toThrow();
  });

  it("mock tracks messages when captureMessages enabled", () => {
    const mock = createMockLogger({ captureMessages: true });

    mock.implementation.log("first");
    mock.implementation.log("second");

    const messages = mock.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0].message).toBe("first");
    expect(messages[1].message).toBe("second");
  });

  it("mock clear() resets state", () => {
    const mock = createMockLogger({ captureMessages: true });

    mock.implementation.log("message");
    expect(mock.getMessages()).toHaveLength(1);

    mock.clear();
    expect(mock.getMessages()).toHaveLength(0);
  });

  it("mock provides count methods", () => {
    const mock = createMockLogger({ captureMessages: true });

    mock.implementation.log("log1");
    mock.implementation.log("log2");
    mock.implementation.error("error1");

    expect(mock.getLogCount()).toBe(2);
    expect(mock.getErrorCount()).toBe(1);
  });
});

// =============================================================================
// Database Contract Tests
// =============================================================================

describe("contract: createMockDatabase", () => {
  it("mock implements query method", async () => {
    const mock = createMockDatabase();

    expect(typeof mock.implementation.query).toBe("function");

    // Query should return a promise
    const result = mock.implementation.query("SELECT 1");
    expect(result).toBeInstanceOf(Promise);
  });

  it("mock tracks query calls correctly", async () => {
    const mock = createMockDatabase();

    await mock.implementation.query("SELECT 1");
    await mock.implementation.query("SELECT 2", ["param"]);

    const queries = mock.getQueries();
    expect(queries).toHaveLength(2);
    expect(queries[0].sql).toBe("SELECT 1");
    expect(queries[1].sql).toBe("SELECT 2");
    expect(queries[1].params).toEqual(["param"]);
  });

  it("mock respects queryResult option", async () => {
    const mockData = [{ id: 1, name: "test" }];
    const mock = createMockDatabase({ queryResult: mockData });

    const result = await mock.implementation.query("SELECT * FROM users");
    expect(result).toEqual(mockData);
  });

  it("mock can simulate failures", async () => {
    const mock = createMockDatabase({ shouldFail: true, errorMessage: "DB offline" });

    await expect(mock.implementation.query("SELECT 1")).rejects.toThrow("DB offline");
  });

  it("mock clear() resets state", async () => {
    const mock = createMockDatabase();

    await mock.implementation.query("SELECT 1");
    expect(mock.getQueryCount()).toBe(1);

    mock.clear();
    expect(mock.getQueryCount()).toBe(0);
  });
});

// =============================================================================
// Cache Contract Tests
// =============================================================================

describe("contract: createMockCache", () => {
  it("mock implements get, set, and invalidate methods", () => {
    const mock = createMockCache();

    expect(typeof mock.implementation.get).toBe("function");
    expect(typeof mock.implementation.set).toBe("function");
    expect(typeof mock.implementation.invalidate).toBe("function");
  });

  it("mock stores and retrieves values", () => {
    const mock = createMockCache<string>();

    mock.implementation.set("key1", "value1");
    const result = mock.implementation.get("key1");

    expect(result).toBe("value1");
  });

  it("mock returns undefined for missing keys", () => {
    const mock = createMockCache();

    const result = mock.implementation.get("nonexistent");
    expect(result).toBeUndefined();
  });

  it("mock tracks operations correctly", () => {
    const mock = createMockCache<number>();

    mock.implementation.set("a", 1);
    mock.implementation.get("a");
    mock.implementation.get("b");

    const ops = mock.getOperations();
    expect(ops).toHaveLength(3);
    expect(ops[0]).toEqual({ op: "set", key: "a" });
    expect(ops[1]).toEqual({ op: "get", key: "a" });
    expect(ops[2]).toEqual({ op: "get", key: "b" });
  });

  it("mock clear() resets state", () => {
    const mock = createMockCache<string>();

    mock.implementation.set("key", "value");
    expect(mock.getOperations()).toHaveLength(1);

    mock.clear();
    expect(mock.getOperations()).toHaveLength(0);
    expect(mock.implementation.get("key")).toBeUndefined();
  });

  it("mock invalidate removes values", () => {
    const mock = createMockCache<string>();

    mock.implementation.set("key", "value");
    expect(mock.implementation.get("key")).toBe("value");

    mock.implementation.invalidate("key");
    expect(mock.implementation.get("key")).toBeUndefined();
  });
});

// =============================================================================
// Config Contract Tests
// =============================================================================

describe("contract: createMockConfig", () => {
  it("mock implements get and getNumber methods", () => {
    const mock = createMockConfig();

    expect(typeof mock.implementation.get).toBe("function");
    expect(typeof mock.implementation.getNumber).toBe("function");
  });

  it("mock returns configured values", () => {
    const mock = createMockConfig({
      values: {
        "app.name": "TestApp",
        "app.port": 3000,
      },
    });

    expect(mock.implementation.get("app.name")).toBe("TestApp");
    expect(mock.implementation.getNumber("app.port")).toBe(3000);
  });

  it("mock returns empty string for missing keys", () => {
    const mock = createMockConfig();

    expect(mock.implementation.get("nonexistent")).toBe("");
  });

  it("mock returns 0 for missing numeric keys", () => {
    const mock = createMockConfig();

    expect(mock.implementation.getNumber("nonexistent")).toBe(0);
  });

  it("mock tracks accessed keys", () => {
    const mock = createMockConfig({ values: { key1: "value1" } });

    mock.implementation.get("key1");
    mock.implementation.get("key2");

    expect(mock.getAccessedKeys()).toEqual(["key1", "key2"]);
  });
});

// =============================================================================
// Call Tracker Contract Tests
// =============================================================================

describe("contract: createCallTracker", () => {
  it("wraps a service and tracks method calls", () => {
    const service = {
      greet(name: string): string {
        return `Hello, ${name}!`;
      },
    };

    const tracked = createCallTracker(service);

    const result = tracked.service.greet("World");

    expect(result).toBe("Hello, World!");
    expect(tracked.getCallsFor("greet")).toHaveLength(1);
    expect(tracked.getCallsFor("greet")[0].args).toEqual(["World"]);
  });

  it("tracks multiple methods independently", () => {
    const service = {
      methodA(): void {},
      methodB(): void {},
    };

    const tracked = createCallTracker(service);

    tracked.service.methodA();
    tracked.service.methodA();
    tracked.service.methodB();

    expect(tracked.getCallCount("methodA")).toBe(2);
    expect(tracked.getCallCount("methodB")).toBe(1);
  });

  it("getCallsFor returns empty array for uncalled methods", () => {
    const service = { method(): void {} };
    const tracked = createCallTracker(service);

    expect(tracked.getCallsFor("method")).toEqual([]);
  });

  it("wasCalledWith checks arguments correctly", () => {
    const service = {
      method(_a: string, _b: number): void {},
    };

    const tracked = createCallTracker(service);
    tracked.service.method("test", 42);

    expect(tracked.wasCalledWith("method", "test", 42)).toBe(true);
    expect(tracked.wasCalledWith("method", "test", 99)).toBe(false);
  });

  it("reset() clears all tracked calls", () => {
    const service = { method(): void {} };
    const tracked = createCallTracker(service);

    tracked.service.method();
    expect(tracked.getCalls()).toHaveLength(1);

    tracked.reset();
    expect(tracked.getCalls()).toHaveLength(0);
  });
});

// =============================================================================
// Call Sequence Tracker Contract Tests
// =============================================================================

describe("contract: createCallSequenceTracker", () => {
  it("tracks call order across multiple services", () => {
    const tracker = createCallSequenceTracker();

    const serviceA = tracker.createTracker("serviceA", {
      method: () => {},
    });

    const serviceB = tracker.createTracker("serviceB", {
      method: () => {},
    });

    serviceA.method();
    serviceB.method();
    serviceA.method();

    const sequence = tracker.getSequence();
    expect(sequence).toHaveLength(3);
    expect(sequence[0].service).toBe("serviceA");
    expect(sequence[1].service).toBe("serviceB");
    expect(sequence[2].service).toBe("serviceA");
  });

  it("assertOrder validates correct ordering", () => {
    const tracker = createCallSequenceTracker();

    const svc = tracker.createTracker("svc", {
      a: () => {},
      b: () => {},
    });

    svc.a();
    svc.b();

    // Should not throw
    expect(() => tracker.assertOrder(["svc.a", "svc.b"])).not.toThrow();
  });

  it("assertOrder throws on incorrect ordering", () => {
    const tracker = createCallSequenceTracker();

    const svc = tracker.createTracker("svc", {
      a: () => {},
      b: () => {},
    });

    svc.b(); // B called first
    svc.a(); // A called second

    // Should throw because order doesn't match
    expect(() => tracker.assertOrder(["svc.a", "svc.b"])).toThrow();
  });

  it("assertCalledBefore validates ordering", () => {
    const tracker = createCallSequenceTracker();

    const svc = tracker.createTracker("svc", {
      init: () => {},
      process: () => {},
    });

    svc.init();
    svc.process();

    expect(() => tracker.assertCalledBefore("svc.init", "svc.process")).not.toThrow();
  });

  it("assertCalledBefore throws when order is wrong", () => {
    const tracker = createCallSequenceTracker();

    const svc = tracker.createTracker("svc", {
      init: () => {},
      process: () => {},
    });

    svc.process();
    svc.init();

    expect(() => tracker.assertCalledBefore("svc.init", "svc.process")).toThrow();
  });

  it("clear() resets sequence", () => {
    const tracker = createCallSequenceTracker();

    const svc = tracker.createTracker("svc", { method: () => {} });
    svc.method();

    expect(tracker.getSequence()).toHaveLength(1);

    tracker.clear();
    expect(tracker.getSequence()).toHaveLength(0);
  });
});
