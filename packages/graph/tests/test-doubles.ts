/**
 * Test doubles utilities for @hex-di/graph tests.
 *
 * Provides configurable mock factories, call tracking, and sequence verification
 * to enable behavioral testing beyond structural verification.
 *
 * @packageDocumentation
 */

import { createAdapter, type Adapter, type Lifetime, type Port } from "@hex-di/core";
import { nextSequence } from "./utils/sequence.js";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Represents a tracked method call with metadata.
 */
export interface TrackedCall {
  readonly method: string;
  readonly args: readonly unknown[];
  readonly timestamp: number;
}

/**
 * A service wrapped with call tracking capabilities.
 */
export interface CallTrackedService<T> {
  /** The wrapped service with tracking enabled */
  readonly service: T;
  /** Get all tracked calls */
  getCalls(): readonly TrackedCall[];
  /** Get calls for a specific method */
  getCallsFor(method: string): readonly TrackedCall[];
  /** Get the number of times a method was called */
  getCallCount(method: string): number;
  /** Check if a method was called with specific arguments */
  wasCalledWith(method: string, ...args: unknown[]): boolean;
  /** Reset all tracked calls */
  reset(): void;
}

/**
 * Options for creating a mock logger.
 */
export interface MockLoggerOptions {
  /** Whether to capture log messages for later inspection */
  captureMessages?: boolean;
  /** Callback invoked on log() calls */
  onLog?: (message: string) => void;
  /** Callback invoked on error() calls */
  onError?: (message: string, error?: Error) => void;
  /** Override specific methods while keeping defaults for others */
  methodOverrides?: MethodOverrides<MockLoggerResult["implementation"]>;
}

/**
 * Options for creating a mock database.
 */
export interface MockDatabaseOptions<T> {
  /** The result to return from query() */
  queryResult?: T;
  /** Whether queries should throw an error */
  shouldFail?: boolean;
  /** Custom error message when shouldFail is true */
  errorMessage?: string;
  /** Override specific methods while keeping defaults for others */
  methodOverrides?: MethodOverrides<MockDatabaseResult<T>["implementation"]>;
}

/**
 * Options for creating a mock cache.
 */
export interface MockCacheOptions<T> {
  /** Override specific methods while keeping defaults for others */
  methodOverrides?: MethodOverrides<MockCacheResult<T>["implementation"]>;
}

/**
 * Options for creating a mock config.
 */
export interface MockConfigOptions {
  /** Preset config values */
  values?: Record<string, string | number>;
  /** Override specific methods while keeping defaults for others */
  methodOverrides?: MethodOverrides<MockConfigResult["implementation"]>;
}

/**
 * A captured log message with its level.
 */
export interface CapturedMessage {
  readonly level: "log" | "error";
  readonly message: string;
}

/**
 * A tracked query with parameters.
 */
export interface TrackedQuery {
  readonly sql: string;
  readonly params?: readonly unknown[];
}

/**
 * A tracked cache operation.
 */
export interface TrackedCacheOperation {
  readonly op: "get" | "set" | "invalidate";
  readonly key: string;
}

/**
 * A tracked call in a sequence across multiple services.
 */
export interface SequencedCall {
  readonly service: string;
  readonly method: string;
  readonly timestamp: number;
}

// =============================================================================
// Mock Factory Return Types
// =============================================================================
//
// These interfaces define the explicit return types for mock factory functions.
// Having explicit types improves:
// - IDE autocompletion and hover documentation
// - Type inference when assigning to variables
// - AI tooling comprehension of the API surface
//

/**
 * Return type for `createMockLogger`.
 */
export interface MockLoggerResult {
  /** The mock logger implementation */
  readonly implementation: {
    readonly log: (message: string) => void;
    readonly error: (message: string, error?: Error) => void;
  };
  /** Get all captured messages (if captureMessages was enabled) */
  getMessages(): readonly CapturedMessage[];
  /** Get count of log-level messages */
  getLogCount(): number;
  /** Get count of error-level messages */
  getErrorCount(): number;
  /** Clear all captured messages */
  clear(): void;
}

/**
 * Return type for `createMockDatabase`.
 */
export interface MockDatabaseResult<T> {
  /** The mock database implementation */
  readonly implementation: {
    readonly query: (sql: string, params?: unknown[]) => Promise<T>;
    readonly execute: (sql: string, params?: unknown[]) => Promise<void>;
  };
  /** Get all tracked queries */
  getQueries(): readonly TrackedQuery[];
  /** Get the number of queries executed */
  getQueryCount(): number;
  /** Clear all tracked queries */
  clear(): void;
}

/**
 * Return type for `createMockCache`.
 */
export interface MockCacheResult<T> {
  /** The mock cache implementation */
  readonly implementation: {
    readonly get: (key: string) => T | undefined;
    readonly set: (key: string, value: T) => void;
    readonly invalidate: (key: string) => void;
  };
  /** Get the current state of the cache as a plain object (immutable) */
  getState(): Readonly<Record<string, T>>;
  /** Get all tracked operations (immutable) */
  getOperations(): readonly TrackedCacheOperation[];
  /** Clear both state and tracked operations */
  clear(): void;
}

/**
 * Return type for `createMockConfig`.
 */
export interface MockConfigResult {
  /** The mock config implementation */
  readonly implementation: {
    readonly get: (key: string) => string;
    readonly getNumber: (key: string) => number;
  };
  /** Get all keys that have been accessed */
  getAccessedKeys(): readonly string[];
  /** Clear accessed keys tracking */
  clear(): void;
}

/**
 * Return type for `createCallSequenceTracker`.
 */
export interface CallSequenceTrackerResult {
  /** Manually track a call */
  track(service: string, method: string): void;
  /** Wrap a service to automatically track all method calls */
  createTracker<T extends Record<string, unknown>>(name: string, service: T): T;
  /** Get the full call sequence */
  getSequence(): readonly SequencedCall[];
  /**
   * Assert that calls occurred in the exact order specified.
   * @throws Error if the order doesn't match
   */
  assertOrder(expected: readonly string[]): void;
  /**
   * Assert that one call occurred before another.
   * @throws Error if the ordering is wrong or either call wasn't made
   */
  assertCalledBefore(first: string, second: string): void;
  /** Clear the call sequence */
  clear(): void;
}

// =============================================================================
// Partial Override Support
// =============================================================================

/**
 * Extracts method names from a type (functions only).
 */
type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never;
}[keyof T];

/**
 * Partial method overrides - only allows overriding existing methods.
 */
export type MethodOverrides<T> = {
  [K in MethodNames<T>]?: T[K];
};

// =============================================================================
// Deep Equality Utility
// =============================================================================

/**
 * Performs deep equality comparison between two values.
 *
 * Handles:
 * - Primitives (strict equality)
 * - Arrays (element-wise comparison)
 * - Objects (property-wise comparison)
 * - null/undefined
 * - Circular references (via seen Set)
 * - Functions (reference equality)
 *
 * @internal
 */
function deepEqual(a: unknown, b: unknown, seen = new Set<object>()): boolean {
  // Handle primitives and strict equality
  if (a === b) return true;

  // Handle null/undefined
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  // Handle different types
  if (typeof a !== typeof b) return false;

  // Handle functions (reference equality)
  if (typeof a === "function") return a === b;

  // Handle non-objects (primitives that aren't strictly equal)
  if (typeof a !== "object") return false;

  // Both are objects at this point
  const objA = a as object;
  const objB = b as object;

  // Handle circular references
  if (seen.has(objA) || seen.has(objB)) {
    // If we've seen either, treat them as equal if same reference
    return objA === objB;
  }
  seen.add(objA);
  seen.add(objB);

  // Handle arrays
  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) return false;
    for (let i = 0; i < objA.length; i++) {
      if (!deepEqual(objA[i], objB[i], seen)) return false;
    }
    return true;
  }

  // Handle array vs non-array mismatch
  if (Array.isArray(objA) !== Array.isArray(objB)) return false;

  // Handle plain objects
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (
      !deepEqual(
        (objA as Record<string, unknown>)[key],
        (objB as Record<string, unknown>)[key],
        seen
      )
    ) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Call Tracker Utility
// =============================================================================

/**
 * Wraps a service implementation to track all method calls.
 * Enables verification of call counts, arguments, and sequences.
 *
 * @example
 * ```typescript
 * const tracker = createCallTracker({
 *   log: (msg: string) => console.log(msg),
 *   error: (msg: string) => console.error(msg),
 * });
 *
 * tracker.service.log("hello");
 * tracker.service.log("world");
 *
 * expect(tracker.getCallCount("log")).toBe(2);
 * expect(tracker.wasCalledWith("log", "hello")).toBe(true);
 * ```
 */
export function createCallTracker<T extends Record<string, unknown>>(
  service: T
): CallTrackedService<T> {
  const calls: TrackedCall[] = [];

  const tracked: Record<string, unknown> = {};
  for (const key of Object.keys(service)) {
    const value = service[key];
    if (typeof value === "function") {
      tracked[key] = (...args: unknown[]) => {
        calls.push({ method: key, args, timestamp: nextSequence() });
        return (value as (...args: unknown[]) => unknown)(...args);
      };
    } else {
      tracked[key] = value;
    }
  }

  return {
    service: tracked as T,
    getCalls: () => Object.freeze([...calls]),
    getCallsFor: (method: string) => Object.freeze(calls.filter(c => c.method === method)),
    getCallCount: (method: string) => calls.filter(c => c.method === method).length,
    wasCalledWith: (method: string, ...expectedArgs: unknown[]) =>
      calls.some(c => c.method === method && deepEqual([...c.args], expectedArgs)),
    reset: () => {
      calls.length = 0;
    },
  };
}

// =============================================================================
// Mock Logger Factory
// =============================================================================

/**
 * Creates a configurable logger mock with optional message capture.
 *
 * @example
 * ```typescript
 * const mock = createMockLogger({ captureMessages: true });
 *
 * mock.implementation.log("Starting...");
 * mock.implementation.error("Failed!", new Error("oops"));
 *
 * expect(mock.getLogCount()).toBe(1);
 * expect(mock.getErrorCount()).toBe(1);
 * expect(mock.getMessages()).toHaveLength(2);
 * ```
 */
export function createMockLogger(options: MockLoggerOptions = {}): MockLoggerResult {
  const messages: CapturedMessage[] = [];

  const defaultLog = (message: string) => {
    if (options.captureMessages) {
      messages.push({ level: "log", message });
    }
    options.onLog?.(message);
  };

  const defaultError = (message: string, error?: Error) => {
    if (options.captureMessages) {
      messages.push({ level: "error", message });
    }
    options.onError?.(message, error);
  };

  return {
    implementation: {
      log: options.methodOverrides?.log ?? defaultLog,
      error: options.methodOverrides?.error ?? defaultError,
    },
    /** Get all captured messages (immutable) */
    getMessages: (): readonly CapturedMessage[] => Object.freeze([...messages]),
    /** Get count of log-level messages */
    getLogCount: () => messages.filter(m => m.level === "log").length,
    /** Get count of error-level messages */
    getErrorCount: () => messages.filter(m => m.level === "error").length,
    /** Clear all captured messages */
    clear: () => {
      messages.length = 0;
    },
  };
}

// =============================================================================
// Mock Database Factory
// =============================================================================

/**
 * Creates a configurable database mock with query result control.
 *
 * @example
 * ```typescript
 * const mock = createMockDatabase({ queryResult: [{ id: 1 }] });
 *
 * const result = await mock.implementation.query("SELECT * FROM users");
 * expect(result).toEqual([{ id: 1 }]);
 * expect(mock.getQueryCount()).toBe(1);
 *
 * // Error scenario
 * const failMock = createMockDatabase({ shouldFail: true, errorMessage: "DB offline" });
 * await expect(failMock.implementation.query("SELECT 1")).rejects.toThrow("DB offline");
 * ```
 */
export function createMockDatabase<T = unknown>(
  options: MockDatabaseOptions<T> = {}
): MockDatabaseResult<T> {
  const queries: TrackedQuery[] = [];

  const defaultQuery = async (sql: string, params?: unknown[]): Promise<T> => {
    queries.push({ sql, params });
    if (options.shouldFail) {
      throw new Error(options.errorMessage ?? "Query failed");
    }
    return (options.queryResult ?? {}) as T;
  };

  const defaultExecute = async (sql: string, params?: unknown[]): Promise<void> => {
    queries.push({ sql, params });
    if (options.shouldFail) {
      throw new Error(options.errorMessage ?? "Execute failed");
    }
  };

  return {
    implementation: {
      query: options.methodOverrides?.query ?? defaultQuery,
      execute: options.methodOverrides?.execute ?? defaultExecute,
    },
    /** Get all tracked queries (immutable) */
    getQueries: (): readonly TrackedQuery[] => Object.freeze([...queries]),
    /** Get the number of queries executed */
    getQueryCount: () => queries.length,
    /** Clear all tracked queries */
    clear: () => {
      queries.length = 0;
    },
  };
}

// =============================================================================
// Mock Cache Factory
// =============================================================================

/**
 * Creates a mock cache with full state inspection.
 *
 * @example
 * ```typescript
 * const mock = createMockCache<string>();
 *
 * mock.implementation.set("user:1", "Alice");
 * expect(mock.implementation.get("user:1")).toBe("Alice");
 *
 * mock.implementation.invalidate("user:1");
 * expect(mock.implementation.get("user:1")).toBeUndefined();
 *
 * expect(mock.getOperations()).toHaveLength(3);
 * ```
 */
export function createMockCache<T = unknown>(
  options: MockCacheOptions<T> = {}
): MockCacheResult<T> {
  const store = new Map<string, T>();
  const operations: TrackedCacheOperation[] = [];

  const defaultGet = (key: string): T | undefined => {
    operations.push({ op: "get", key });
    return store.get(key);
  };

  const defaultSet = (key: string, value: T): void => {
    operations.push({ op: "set", key });
    store.set(key, value);
  };

  const defaultInvalidate = (key: string): void => {
    operations.push({ op: "invalidate", key });
    store.delete(key);
  };

  return {
    implementation: {
      get: options.methodOverrides?.get ?? defaultGet,
      set: options.methodOverrides?.set ?? defaultSet,
      invalidate: options.methodOverrides?.invalidate ?? defaultInvalidate,
    },
    /** Get the current state of the cache as a plain object (immutable) */
    getState: (): Readonly<Record<string, T>> => Object.freeze(Object.fromEntries(store)),
    /** Get all tracked operations (immutable) */
    getOperations: (): readonly TrackedCacheOperation[] => Object.freeze([...operations]),
    /** Clear both state and tracked operations */
    clear: () => {
      store.clear();
      operations.length = 0;
    },
  };
}

// =============================================================================
// Mock Config Factory
// =============================================================================

/**
 * Creates a config mock with preset values.
 *
 * @example
 * ```typescript
 * const mock = createMockConfig({
 *   values: {
 *     DATABASE_URL: "postgres://localhost/test",
 *     PORT: 3000,
 *   },
 * });
 *
 * expect(mock.implementation.get("DATABASE_URL")).toBe("postgres://localhost/test");
 * expect(mock.implementation.getNumber("PORT")).toBe(3000);
 * expect(mock.getAccessedKeys()).toContain("DATABASE_URL");
 * ```
 */
export function createMockConfig(options: MockConfigOptions = {}): MockConfigResult {
  const values = options.values ?? {};
  const accessed: string[] = [];

  const defaultGet = (key: string): string => {
    accessed.push(key);
    const value = values[key];
    return value !== undefined ? String(value) : "";
  };

  const defaultGetNumber = (key: string): number => {
    accessed.push(key);
    const value = values[key];
    return value !== undefined ? Number(value) : 0;
  };

  return {
    implementation: {
      get: options.methodOverrides?.get ?? defaultGet,
      getNumber: options.methodOverrides?.getNumber ?? defaultGetNumber,
    },
    /** Get all keys that have been accessed (immutable) */
    getAccessedKeys: (): readonly string[] => Object.freeze([...accessed]),
    /** Clear accessed keys tracking */
    clear: () => {
      accessed.length = 0;
    },
  };
}

// =============================================================================
// Call Sequence Tracker
// =============================================================================

/**
 * Tracks call sequences across multiple services for ordering verification.
 *
 * @example
 * ```typescript
 * const tracker = createCallSequenceTracker();
 *
 * const logger = tracker.createTracker("Logger", { log: () => {} });
 * const db = tracker.createTracker("Database", { query: async () => ({}) });
 *
 * logger.log("start");
 * await db.query("SELECT 1");
 *
 * tracker.assertCalledBefore("Logger.log", "Database.query");
 * tracker.assertOrder(["Logger.log", "Database.query"]);
 * ```
 */
export function createCallSequenceTracker(): CallSequenceTrackerResult {
  const sequence: SequencedCall[] = [];

  return {
    /** Manually track a call */
    track: (service: string, method: string) => {
      sequence.push({ service, method, timestamp: nextSequence() });
    },

    /**
     * Wrap a service to automatically track all method calls.
     */
    createTracker: <T extends Record<string, unknown>>(name: string, service: T): T => {
      const tracked: Record<string, unknown> = {};
      for (const key of Object.keys(service)) {
        const value = service[key];
        if (typeof value === "function") {
          tracked[key] = (...args: unknown[]) => {
            sequence.push({ service: name, method: key, timestamp: nextSequence() });
            return (value as (...args: unknown[]) => unknown)(...args);
          };
        } else {
          tracked[key] = value;
        }
      }
      return tracked as T;
    },

    /** Get the full call sequence (immutable) */
    getSequence: (): readonly SequencedCall[] => Object.freeze([...sequence]),

    /**
     * Assert that calls occurred in the exact order specified.
     * @throws Error if the order doesn't match
     */
    assertOrder: (expected: readonly string[]) => {
      const actual = sequence.map(s => `${s.service}.${s.method}`);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
          `Call order mismatch.\nExpected: ${expected.join(" → ")}\nActual: ${actual.join(" → ")}`
        );
      }
    },

    /**
     * Assert that one call occurred before another.
     * @throws Error if the ordering is wrong or either call wasn't made
     */
    assertCalledBefore: (first: string, second: string) => {
      const firstIdx = sequence.findIndex(s => `${s.service}.${s.method}` === first);
      const secondIdx = sequence.findIndex(s => `${s.service}.${s.method}` === second);
      if (firstIdx === -1) {
        throw new Error(`Expected ${first} to be called, but it was never called`);
      }
      if (secondIdx === -1) {
        throw new Error(`Expected ${second} to be called, but it was never called`);
      }
      if (firstIdx >= secondIdx) {
        throw new Error(`Expected ${first} to be called before ${second}`);
      }
    },

    /** Clear the call sequence */
    clear: () => {
      sequence.length = 0;
    },
  };
}

// =============================================================================
// Mock Adapter Factory
// =============================================================================

/**
 * Configuration options for createMockAdapter.
 */
export interface MockAdapterOptions<TPort> {
  /** Lifetime scope (default: "singleton") */
  lifetime?: Lifetime;
  /** Whether the adapter is clonable for forked inheritance (default: false) */
  clonable?: boolean;
  /** Whether to use async factory (default: false) */
  async?: boolean;
  /** Custom implementation to merge with default stub */
  implementation?: Partial<TPort>;
}

/**
 * Creates a mock adapter for any port with configurable options.
 *
 * This is the primary factory function for creating test adapters. It provides
 * sensible defaults while allowing full customization when needed.
 *
 * @typeParam TService - The service interface type
 * @typeParam TName - The port name literal type
 *
 * @param port - The port to create an adapter for
 * @param options - Configuration options
 * @returns A configured adapter (sync or async based on options)
 *
 * @example Basic usage
 * ```typescript
 * const adapter = createMockAdapter(LoggerPort);
 * ```
 *
 * @example With custom lifetime
 * ```typescript
 * const adapter = createMockAdapter(DatabasePort, { lifetime: "scoped" });
 * ```
 *
 * @example With custom implementation
 * ```typescript
 * const adapter = createMockAdapter(LoggerPort, {
 *   implementation: { log: (msg) => console.log(`[TEST] ${msg}`) }
 * });
 * ```
 *
 * @example Async adapter
 * ```typescript
 * const adapter = createMockAdapter(ConfigPort, { async: true });
 * ```
 */
export function createMockAdapter<TService extends object, TName extends string>(
  port: Port<TName, TService>,
  options: MockAdapterOptions<TService> = {}
): Adapter<Port<TName, TService>, never, Lifetime, "sync" | "async", boolean> {
  const { lifetime = "singleton", clonable = false, async: isAsync = false } = options;

  // Create a stub implementation that returns empty/noop values
  const stubImplementation = new Proxy({} as TService, {
    get(_target, prop) {
      // If custom implementation provided, use it
      if (options.implementation && prop in options.implementation) {
        return (options.implementation as Record<string | symbol, unknown>)[prop];
      }
      // Default: return a no-op function for any method call
      return () => {};
    },
  });

  type ReturnType = Adapter<Port<TName, TService>, never, Lifetime, "sync" | "async", boolean>;

  if (isAsync) {
    // Cast needed because createAdapter returns EnforceAsyncLifetime which is wider than Lifetime
    return createAdapter({
      provides: port,
      requires: [],
      clonable,
      factory: async () => stubImplementation,
    }) as ReturnType;
  }

  // Cast needed because createAdapter returns EnforceAsyncLifetime which is wider than Lifetime
  return createAdapter({
    provides: port,
    requires: [],
    lifetime,
    clonable,
    factory: () => stubImplementation,
  }) as ReturnType;
}
