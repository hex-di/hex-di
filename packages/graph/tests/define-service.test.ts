/**
 * Unit tests for defineService and defineAsyncService helper functions.
 *
 * These tests verify runtime behavior:
 * 1. Returns frozen tuple of [Port, Adapter]
 * 2. Port has correct __portName
 * 3. Adapter has correct provides, requires, lifetime, factory
 * 4. Defaults: requires=[], lifetime="singleton"
 * 5. Custom requires and lifetime work
 * 6. Finalizer option is passed through
 * 7. defineAsyncService enforces singleton lifetime
 */

import { describe, expect, it, vi } from "vitest";
import { defineService, defineAsyncService } from "@hex-di/core";
import {
  type Logger,
  type Database,
  type UserService,
  LoggerPort,
  DatabasePort,
} from "./fixtures.js";

// Local interface for Config (different signature from fixtures.ConfigService)
interface Config {
  get(key: string): string;
}

// =============================================================================
// defineService Unit Tests
// =============================================================================

describe("defineService function", () => {
  it("returns a frozen tuple", () => {
    const result = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it("first element is a Port with correct __portName", () => {
    const [port] = defineService<"TestPort", Config>("TestPort", {
      factory: () => ({ get: () => "" }),
    });

    expect(port.__portName).toBe("TestPort");
  });

  it("second element is a frozen Adapter", () => {
    const [, adapter] = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
    });

    expect(Object.isFrozen(adapter)).toBe(true);
    expect(adapter.provides).toBeDefined();
    expect(adapter.requires).toBeDefined();
    expect(adapter.lifetime).toBeDefined();
    expect(adapter.factory).toBeDefined();
  });

  it("adapter.provides references the created port", () => {
    const [port, adapter] = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
    });

    expect(adapter.provides).toBe(port);
  });

  it("defaults requires to empty array", () => {
    const [, adapter] = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
    });

    expect(adapter.requires).toEqual([]);
    expect(adapter.requires.length).toBe(0);
  });

  it("defaults lifetime to singleton", () => {
    const [, adapter] = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
    });

    expect(adapter.lifetime).toBe("singleton");
  });

  it("accepts custom requires", () => {
    // Use inferred types via factory return type annotation
    const [, adapter] = defineService("UserService", {
      requires: [LoggerPort, DatabasePort],
      factory: (): UserService => ({
        getUser: id => Promise.resolve({ id, name: "test" }),
      }),
    });

    expect(adapter.requires).toEqual([LoggerPort, DatabasePort]);
    expect(adapter.requires.length).toBe(2);
  });

  it("accepts custom lifetime", () => {
    // Use inferred types via factory return type annotation
    const [, adapter] = defineService("Logger", {
      lifetime: "scoped",
      factory: (): Logger => ({ log: () => {} }),
    });

    expect(adapter.lifetime).toBe("scoped");
  });

  it("accepts transient lifetime", () => {
    // Use inferred types via factory return type annotation
    const [, adapter] = defineService("Logger", {
      lifetime: "transient",
      factory: (): Logger => ({ log: () => {} }),
    });

    expect(adapter.lifetime).toBe("transient");
  });

  it("passes through finalizer", () => {
    const finalizer = vi.fn();

    const [, adapter] = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
      finalizer,
    });

    expect(adapter.finalizer).toBe(finalizer);
  });

  it("factory function is callable and returns service", () => {
    const loggerImpl: Logger = { log: () => {} };

    const [, adapter] = defineService<"Logger", Logger>("Logger", {
      factory: () => loggerImpl,
    });

    expect(adapter.factory({})).toBe(loggerImpl);
  });

  it("factory receives dependencies object", () => {
    const mockLogger: Logger = { log: () => {} };
    const mockDatabase: Database = { query: () => Promise.resolve({}) };
    let receivedDeps: unknown;

    // Use inferred types via factory return type annotation
    const [, adapter] = defineService("UserService", {
      requires: [LoggerPort, DatabasePort],
      factory: (deps): UserService => {
        receivedDeps = deps;
        return {
          getUser: id => Promise.resolve({ id, name: "test" }),
        };
      },
    });

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
// defineAsyncService Unit Tests
// =============================================================================

describe("defineAsyncService function", () => {
  it("returns a frozen tuple", () => {
    const result = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it("first element is a Port with correct __portName", () => {
    const [port] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });

    expect(port.__portName).toBe("Config");
  });

  it("second element is a frozen Adapter", () => {
    const [, adapter] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });

    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("adapter.provides references the created port", () => {
    const [port, adapter] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });

    expect(adapter.provides).toBe(port);
  });

  it("defaults requires to empty array", () => {
    const [, adapter] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });

    expect(adapter.requires).toEqual([]);
  });

  it("lifetime is always singleton", () => {
    const [, adapter] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });

    expect(adapter.lifetime).toBe("singleton");
  });

  it("accepts custom requires", () => {
    // Use inferred types via factory return type annotation
    const [, adapter] = defineAsyncService("Database", {
      requires: [LoggerPort],
      factory: async (): Promise<Database> => ({ query: () => Promise.resolve({}) }),
    });

    expect(adapter.requires).toEqual([LoggerPort]);
  });

  it("passes through finalizer", () => {
    const finalizer = vi.fn();

    const [, adapter] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
      finalizer,
    });

    expect(adapter.finalizer).toBe(finalizer);
  });

  it("factory function returns a Promise", async () => {
    const configImpl: Config = { get: () => "value" };

    const [, adapter] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => configImpl,
    });

    const result = adapter.factory({});
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(configImpl);
  });
});
