/**
 * Test doubles utilities for @hex-di/graph tests.
 *
 * Provides configurable mock factories, call tracking, and sequence verification
 * to enable behavioral testing beyond structural verification.
 *
 * @packageDocumentation
 */

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
        calls.push({ method: key, args, timestamp: Date.now() });
        return (value as (...args: unknown[]) => unknown)(...args);
      };
    } else {
      tracked[key] = value;
    }
  }

  return {
    service: tracked as T,
    getCalls: () => [...calls],
    getCallsFor: (method: string) => calls.filter(c => c.method === method),
    getCallCount: (method: string) => calls.filter(c => c.method === method).length,
    wasCalledWith: (method: string, ...expectedArgs: unknown[]) =>
      calls.some(
        c => c.method === method && JSON.stringify(c.args) === JSON.stringify(expectedArgs)
      ),
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
export function createMockLogger(options: MockLoggerOptions = {}) {
  const messages: CapturedMessage[] = [];

  return {
    implementation: {
      log: (message: string) => {
        if (options.captureMessages) {
          messages.push({ level: "log", message });
        }
        options.onLog?.(message);
      },
      error: (message: string, error?: Error) => {
        if (options.captureMessages) {
          messages.push({ level: "error", message });
        }
        options.onError?.(message, error);
      },
    },
    /** Get all captured messages */
    getMessages: (): readonly CapturedMessage[] => [...messages],
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
export function createMockDatabase<T = unknown>(options: MockDatabaseOptions<T> = {}) {
  const queries: TrackedQuery[] = [];

  return {
    implementation: {
      query: async (sql: string, params?: unknown[]): Promise<T> => {
        queries.push({ sql, params });
        if (options.shouldFail) {
          throw new Error(options.errorMessage ?? "Query failed");
        }
        return (options.queryResult ?? {}) as T;
      },
      execute: async (sql: string, params?: unknown[]): Promise<void> => {
        queries.push({ sql, params });
        if (options.shouldFail) {
          throw new Error(options.errorMessage ?? "Execute failed");
        }
      },
    },
    /** Get all tracked queries */
    getQueries: (): readonly TrackedQuery[] => [...queries],
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
export function createMockCache<T = unknown>() {
  const store = new Map<string, T>();
  const operations: TrackedCacheOperation[] = [];

  return {
    implementation: {
      get: (key: string): T | undefined => {
        operations.push({ op: "get", key });
        return store.get(key);
      },
      set: (key: string, value: T): void => {
        operations.push({ op: "set", key });
        store.set(key, value);
      },
      invalidate: (key: string): void => {
        operations.push({ op: "invalidate", key });
        store.delete(key);
      },
    },
    /** Get the current state of the cache as a plain object */
    getState: (): Record<string, T> => Object.fromEntries(store),
    /** Get all tracked operations */
    getOperations: (): readonly TrackedCacheOperation[] => [...operations],
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
 *   DATABASE_URL: "postgres://localhost/test",
 *   PORT: 3000,
 * });
 *
 * expect(mock.implementation.get("DATABASE_URL")).toBe("postgres://localhost/test");
 * expect(mock.implementation.getNumber("PORT")).toBe(3000);
 * expect(mock.getAccessedKeys()).toContain("DATABASE_URL");
 * ```
 */
export function createMockConfig(values: Record<string, string | number> = {}) {
  const accessed: string[] = [];

  return {
    implementation: {
      get: (key: string): string => {
        accessed.push(key);
        const value = values[key];
        return value !== undefined ? String(value) : "";
      },
      getNumber: (key: string): number => {
        accessed.push(key);
        const value = values[key];
        return value !== undefined ? Number(value) : 0;
      },
    },
    /** Get all keys that have been accessed */
    getAccessedKeys: (): readonly string[] => [...accessed],
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
export function createCallSequenceTracker() {
  const sequence: SequencedCall[] = [];

  return {
    /** Manually track a call */
    track: (service: string, method: string) => {
      sequence.push({ service, method, timestamp: Date.now() });
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
            sequence.push({ service: name, method: key, timestamp: Date.now() });
            return (value as (...args: unknown[]) => unknown)(...args);
          };
        } else {
          tracked[key] = value;
        }
      }
      return tracked as T;
    },

    /** Get the full call sequence */
    getSequence: (): readonly SequencedCall[] => [...sequence],

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
