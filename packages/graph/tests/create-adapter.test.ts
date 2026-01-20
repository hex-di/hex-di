/**
 * Unit tests for createAdapter function.
 *
 * These tests verify runtime behavior:
 * 1. Returned adapter is frozen/immutable
 * 2. Adapter has all required properties
 * 3. Factory function is stored correctly
 */

import { describe, expect, it } from "vitest";
import { createAdapter, createAsyncAdapter } from "../src/index.js";
import {
  type Logger,
  type Database,
  LoggerPort,
  DatabasePort,
  UserServicePort,
} from "./fixtures.js";

// =============================================================================
// createAdapter Unit Tests
// =============================================================================

describe("createAdapter function", () => {
  it("returns a frozen/immutable object", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // Object should be frozen
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("stores provides property correctly", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    expect(adapter.provides).toBe(LoggerPort);
    expect(adapter.provides.__portName).toBe("Logger");
  });

  it("stores requires as readonly array", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: () => ({
        getUser: id => Promise.resolve({ id, name: "test" }),
      }),
    });

    expect(adapter.requires).toEqual([LoggerPort, DatabasePort]);
    expect(adapter.requires.length).toBe(2);
  });

  it("stores empty requires array for zero dependencies", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    expect(adapter.requires).toEqual([]);
    expect(adapter.requires.length).toBe(0);
  });

  it("stores lifetime property correctly", () => {
    const singletonAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const scopedAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: () => {} }),
    });

    const requestAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: () => {} }),
    });

    expect(singletonAdapter.lifetime).toBe("singleton");
    expect(scopedAdapter.lifetime).toBe("scoped");
    expect(requestAdapter.lifetime).toBe("transient");
  });

  it("stores factory function correctly", () => {
    const loggerImpl = { log: () => {} };
    const factory = () => loggerImpl;

    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory,
    });

    // Factory should be stored and callable
    expect(adapter.factory).toBe(factory);
    expect(adapter.factory({})).toBe(loggerImpl);
  });

  it("factory receives dependencies object", () => {
    const mockLogger: Logger = { log: () => {} };
    const mockDatabase: Database = { query: () => Promise.resolve({}) };

    let receivedDeps: unknown;

    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: deps => {
        receivedDeps = deps;
        return {
          getUser: id => Promise.resolve({ id, name: "test" }),
        };
      },
    });

    // Call factory with mock dependencies
    adapter.factory({
      Logger: mockLogger,
      Database: mockDatabase,
    });

    expect(receivedDeps).toEqual({
      Logger: mockLogger,
      Database: mockDatabase,
    });
  });
});

// =============================================================================
// createAsyncAdapter Unit Tests
// =============================================================================

describe("createAsyncAdapter function", () => {
  it("returns a frozen/immutable object", () => {
    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
    });

    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("defaults initPriority to 100", () => {
    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
    });

    expect(adapter.initPriority).toBe(100);
  });

  it("accepts valid initPriority values", () => {
    const lowPriority = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
      initPriority: 0,
    });

    const highPriority = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
      initPriority: 1000,
    });

    expect(lowPriority.initPriority).toBe(0);
    expect(highPriority.initPriority).toBe(1000);
  });

  it("throws RangeError for negative initPriority", () => {
    expect(() =>
      createAsyncAdapter({
        provides: LoggerPort,
        requires: [],
        factory: async () => ({ log: () => {} }),
        initPriority: -1,
      })
    ).toThrow(RangeError);
  });

  it("throws RangeError for initPriority above maximum", () => {
    expect(() =>
      createAsyncAdapter({
        provides: LoggerPort,
        requires: [],
        factory: async () => ({ log: () => {} }),
        initPriority: 1001,
      })
    ).toThrow(RangeError);
  });

  it("error message includes the invalid priority value", () => {
    expect(() =>
      createAsyncAdapter({
        provides: LoggerPort,
        requires: [],
        factory: async () => ({ log: () => {} }),
        initPriority: 9999,
      })
    ).toThrow(/9999/);
  });
});
