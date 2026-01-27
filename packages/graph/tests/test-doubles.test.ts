/**
 * Tests for test-doubles utilities.
 *
 * @packageDocumentation
 */

import { describe, expect, it, vi } from "vitest";
import {
  createCallSequenceTracker,
  createCallTracker,
  createMockCache,
  createMockConfig,
  createMockDatabase,
  createMockLogger,
} from "./test-doubles.js";

describe("test-doubles utilities", () => {
  // ===========================================================================
  // createCallTracker
  // ===========================================================================

  describe("createCallTracker", () => {
    it("tracks method calls", () => {
      const service = {
        log: (_msg: string) => {},
        error: (_msg: string) => {},
      };

      const tracker = createCallTracker(service);

      tracker.service.log("hello");
      tracker.service.log("world");
      tracker.service.error("oops");

      expect(tracker.getCalls()).toHaveLength(3);
      expect(tracker.getCallCount("log")).toBe(2);
      expect(tracker.getCallCount("error")).toBe(1);
    });

    it("captures call arguments", () => {
      const service = {
        add: (a: number, b: number) => a + b,
      };

      const tracker = createCallTracker(service);

      const result = tracker.service.add(2, 3);

      expect(result).toBe(5);
      expect(tracker.getCallsFor("add")).toHaveLength(1);
      expect(tracker.getCallsFor("add")[0]?.args).toEqual([2, 3]);
    });

    it("supports wasCalledWith assertion", () => {
      const service = {
        greet: (_name: string, _formal: boolean) => {},
      };

      const tracker = createCallTracker(service);

      tracker.service.greet("Alice", true);
      tracker.service.greet("Bob", false);

      expect(tracker.wasCalledWith("greet", "Alice", true)).toBe(true);
      expect(tracker.wasCalledWith("greet", "Bob", false)).toBe(true);
      expect(tracker.wasCalledWith("greet", "Charlie", true)).toBe(false);
    });

    it("can be reset", () => {
      const service = { log: (_msg: string) => {} };
      const tracker = createCallTracker(service);

      tracker.service.log("before");
      expect(tracker.getCallCount("log")).toBe(1);

      tracker.reset();

      expect(tracker.getCallCount("log")).toBe(0);
      expect(tracker.getCalls()).toHaveLength(0);
    });

    it("preserves non-function properties", () => {
      const service = {
        name: "TestService",
        version: 1,
        log: (_msg: string) => {},
      };

      const tracker = createCallTracker(service);

      expect((tracker.service as typeof service).name).toBe("TestService");
      expect((tracker.service as typeof service).version).toBe(1);
    });

    it("includes timestamps in tracked calls", () => {
      const service = { log: (_msg: string) => {} };
      const tracker = createCallTracker(service);

      const before = Date.now();
      tracker.service.log("test");
      const after = Date.now();

      const calls = tracker.getCalls();
      expect(calls[0]?.timestamp).toBeGreaterThanOrEqual(before);
      expect(calls[0]?.timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ===========================================================================
  // createMockLogger
  // ===========================================================================

  describe("createMockLogger", () => {
    it("captures log messages when enabled", () => {
      const mock = createMockLogger({ captureMessages: true });

      mock.implementation.log("Starting...");
      mock.implementation.log("Processing...");
      mock.implementation.error("Failed!");

      expect(mock.getMessages()).toHaveLength(3);
      expect(mock.getMessages()[0]).toEqual({ level: "log", message: "Starting..." });
      expect(mock.getMessages()[2]).toEqual({ level: "error", message: "Failed!" });
    });

    it("does not capture messages when disabled", () => {
      const mock = createMockLogger({ captureMessages: false });

      mock.implementation.log("ignored");
      mock.implementation.error("also ignored");

      expect(mock.getMessages()).toHaveLength(0);
    });

    it("triggers callbacks on log/error", () => {
      const onLog = vi.fn();
      const onError = vi.fn();

      const mock = createMockLogger({ onLog, onError });

      mock.implementation.log("hello");
      mock.implementation.error("oops", new Error("test"));

      expect(onLog).toHaveBeenCalledWith("hello");
      expect(onError).toHaveBeenCalledWith("oops", expect.any(Error));
    });

    it("returns correct message counts", () => {
      const mock = createMockLogger({ captureMessages: true });

      mock.implementation.log("a");
      mock.implementation.log("b");
      mock.implementation.error("c");
      mock.implementation.log("d");
      mock.implementation.error("e");

      expect(mock.getLogCount()).toBe(3);
      expect(mock.getErrorCount()).toBe(2);
    });

    it("can be cleared", () => {
      const mock = createMockLogger({ captureMessages: true });

      mock.implementation.log("test");
      mock.implementation.error("error");
      expect(mock.getMessages()).toHaveLength(2);

      mock.clear();

      expect(mock.getMessages()).toHaveLength(0);
      expect(mock.getLogCount()).toBe(0);
      expect(mock.getErrorCount()).toBe(0);
    });
  });

  // ===========================================================================
  // createMockDatabase
  // ===========================================================================

  describe("createMockDatabase", () => {
    it("returns configured query results", async () => {
      const mock = createMockDatabase({ queryResult: [{ id: 1, name: "Alice" }] });

      const result = await mock.implementation.query("SELECT * FROM users");

      expect(result).toEqual([{ id: 1, name: "Alice" }]);
    });

    it("returns empty object by default", async () => {
      const mock = createMockDatabase();

      const result = await mock.implementation.query("SELECT 1");

      expect(result).toEqual({});
    });

    it("throws when shouldFail is true", async () => {
      const mock = createMockDatabase({ shouldFail: true, errorMessage: "Connection lost" });

      await expect(mock.implementation.query("SELECT 1")).rejects.toThrow("Connection lost");
    });

    it("throws default error message when no custom message", async () => {
      const mock = createMockDatabase({ shouldFail: true });

      await expect(mock.implementation.query("SELECT 1")).rejects.toThrow("Query failed");
    });

    it("tracks all queries", async () => {
      const mock = createMockDatabase();

      await mock.implementation.query("SELECT * FROM users", ["param1"]);
      await mock.implementation.execute("DELETE FROM sessions");
      await mock.implementation.query("SELECT COUNT(*) FROM logs");

      expect(mock.getQueryCount()).toBe(3);
      expect(mock.getQueries()[0]).toEqual({ sql: "SELECT * FROM users", params: ["param1"] });
      expect(mock.getQueries()[1]).toEqual({ sql: "DELETE FROM sessions", params: undefined });
    });

    it("can be cleared", async () => {
      const mock = createMockDatabase();

      await mock.implementation.query("SELECT 1");
      await mock.implementation.query("SELECT 2");
      expect(mock.getQueryCount()).toBe(2);

      mock.clear();

      expect(mock.getQueryCount()).toBe(0);
    });

    it("execute throws when shouldFail is true", async () => {
      const mock = createMockDatabase({ shouldFail: true, errorMessage: "Write failed" });

      await expect(mock.implementation.execute("INSERT INTO logs")).rejects.toThrow("Write failed");
    });
  });

  // ===========================================================================
  // createMockCache
  // ===========================================================================

  describe("createMockCache", () => {
    it("stores and retrieves values", () => {
      const mock = createMockCache<string>();

      mock.implementation.set("key1", "value1");
      const result = mock.implementation.get("key1");

      expect(result).toBe("value1");
    });

    it("returns undefined for missing keys", () => {
      const mock = createMockCache<string>();

      expect(mock.implementation.get("nonexistent")).toBeUndefined();
    });

    it("invalidates keys", () => {
      const mock = createMockCache<string>();

      mock.implementation.set("key1", "value1");
      mock.implementation.invalidate("key1");

      expect(mock.implementation.get("key1")).toBeUndefined();
    });

    it("tracks all operations", () => {
      const mock = createMockCache<number>();

      mock.implementation.set("a", 1);
      mock.implementation.get("a");
      mock.implementation.get("b");
      mock.implementation.invalidate("a");

      expect(mock.getOperations()).toEqual([
        { op: "set", key: "a" },
        { op: "get", key: "a" },
        { op: "get", key: "b" },
        { op: "invalidate", key: "a" },
      ]);
    });

    it("exposes internal state", () => {
      const mock = createMockCache<string>();

      mock.implementation.set("x", "1");
      mock.implementation.set("y", "2");
      mock.implementation.set("z", "3");

      expect(mock.getState()).toEqual({ x: "1", y: "2", z: "3" });
    });

    it("can be cleared", () => {
      const mock = createMockCache<string>();

      mock.implementation.set("key", "value");
      mock.implementation.get("key");

      mock.clear();

      expect(mock.getState()).toEqual({});
      expect(mock.getOperations()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // createMockConfig
  // ===========================================================================

  describe("createMockConfig", () => {
    it("returns preset string values", () => {
      const mock = createMockConfig({
        values: {
          DATABASE_URL: "postgres://localhost/test",
          APP_NAME: "TestApp",
        },
      });

      expect(mock.implementation.get("DATABASE_URL")).toBe("postgres://localhost/test");
      expect(mock.implementation.get("APP_NAME")).toBe("TestApp");
    });

    it("returns empty string for missing keys", () => {
      const mock = createMockConfig();

      expect(mock.implementation.get("MISSING")).toBe("");
    });

    it("returns preset number values", () => {
      const mock = createMockConfig({
        values: {
          PORT: 3000,
          TIMEOUT: 5000,
        },
      });

      expect(mock.implementation.getNumber("PORT")).toBe(3000);
      expect(mock.implementation.getNumber("TIMEOUT")).toBe(5000);
    });

    it("returns 0 for missing numeric keys", () => {
      const mock = createMockConfig();

      expect(mock.implementation.getNumber("MISSING")).toBe(0);
    });

    it("converts numbers to strings for get()", () => {
      const mock = createMockConfig({ values: { PORT: 3000 } });

      expect(mock.implementation.get("PORT")).toBe("3000");
    });

    it("tracks accessed keys", () => {
      const mock = createMockConfig({
        values: {
          A: "1",
          B: "2",
          C: 3,
        },
      });

      mock.implementation.get("A");
      mock.implementation.getNumber("C");
      mock.implementation.get("A");
      mock.implementation.get("MISSING");

      expect(mock.getAccessedKeys()).toEqual(["A", "C", "A", "MISSING"]);
    });

    it("can be cleared", () => {
      const mock = createMockConfig({ values: { KEY: "value" } });

      mock.implementation.get("KEY");
      expect(mock.getAccessedKeys()).toHaveLength(1);

      mock.clear();

      expect(mock.getAccessedKeys()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // createCallSequenceTracker
  // ===========================================================================

  describe("createCallSequenceTracker", () => {
    it("tracks calls across multiple services", async () => {
      const tracker = createCallSequenceTracker();

      const logger = tracker.createTracker("Logger", { log: (_msg: string) => {} });
      const db = tracker.createTracker("Database", { query: async () => ({}) });

      logger.log("start");
      await db.query();
      logger.log("done");

      expect(tracker.getSequence()).toHaveLength(3);
      expect(tracker.getSequence().map(s => `${s.service}.${s.method}`)).toEqual([
        "Logger.log",
        "Database.query",
        "Logger.log",
      ]);
    });

    it("supports manual tracking", () => {
      const tracker = createCallSequenceTracker();

      tracker.track("ServiceA", "init");
      tracker.track("ServiceB", "start");

      expect(tracker.getSequence()).toEqual([
        expect.objectContaining({ service: "ServiceA", method: "init" }),
        expect.objectContaining({ service: "ServiceB", method: "start" }),
      ]);
    });

    it("asserts exact call ordering", () => {
      const tracker = createCallSequenceTracker();

      tracker.track("A", "first");
      tracker.track("B", "second");
      tracker.track("C", "third");

      expect(() => {
        tracker.assertOrder(["A.first", "B.second", "C.third"]);
      }).not.toThrow();

      expect(() => {
        tracker.assertOrder(["B.second", "A.first", "C.third"]);
      }).toThrow("Call order mismatch");
    });

    it("supports assertCalledBefore", () => {
      const tracker = createCallSequenceTracker();

      tracker.track("Init", "start");
      tracker.track("DB", "connect");
      tracker.track("Server", "listen");

      expect(() => {
        tracker.assertCalledBefore("Init.start", "Server.listen");
      }).not.toThrow();

      expect(() => {
        tracker.assertCalledBefore("DB.connect", "Init.start");
      }).toThrow("Expected DB.connect to be called before Init.start");
    });

    it("throws descriptive error when call not found", () => {
      const tracker = createCallSequenceTracker();

      tracker.track("A", "method");

      expect(() => {
        tracker.assertCalledBefore("A.method", "B.missing");
      }).toThrow("Expected B.missing to be called, but it was never called");

      expect(() => {
        tracker.assertCalledBefore("C.missing", "A.method");
      }).toThrow("Expected C.missing to be called, but it was never called");
    });

    it("can be cleared", () => {
      const tracker = createCallSequenceTracker();

      tracker.track("A", "method");
      tracker.track("B", "method");
      expect(tracker.getSequence()).toHaveLength(2);

      tracker.clear();

      expect(tracker.getSequence()).toHaveLength(0);
    });

    it("preserves non-function properties in tracked services", () => {
      const tracker = createCallSequenceTracker();

      const service = tracker.createTracker("Test", {
        name: "TestService",
        log: (_msg: string) => {},
      });

      expect((service as { name: string }).name).toBe("TestService");
    });
  });
});
