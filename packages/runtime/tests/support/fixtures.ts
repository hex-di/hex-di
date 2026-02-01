/**
 * Standard test fixtures for @hex-di/runtime tests.
 *
 * Provides reusable ports, adapters, and container presets to reduce
 * boilerplate in test files.
 *
 * @packageDocumentation
 */

import { createPort, createAdapter, type Lifetime } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { vi, type Mock } from "vitest";
import { createContainer } from "../../src/index.js";

// =============================================================================
// Standard Service Interfaces
// =============================================================================

export interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface Database {
  query(sql: string): unknown;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface RequestContext {
  requestId: string;
  timestamp: number;
}

export interface UserService {
  getUser(id: string): unknown;
  createUser(data: unknown): unknown;
}

export interface CacheService {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  delete(key: string): void;
}

export interface ConfigService {
  get(key: string): string | undefined;
  getRequired(key: string): string;
}

// =============================================================================
// Standard Ports
// =============================================================================

export const LoggerPort = createPort<Logger>({ name: "Logger" });
export const DatabasePort = createPort<Database>({ name: "Database" });
export const RequestContextPort = createPort<RequestContext>({ name: "RequestContext" });
export const UserServicePort = createPort<UserService>({ name: "UserService" });
export const CacheServicePort = createPort<CacheService>({ name: "CacheService" });
export const ConfigServicePort = createPort<ConfigService>({ name: "ConfigService" });

// Type-safe port type
export type StandardPort =
  | typeof LoggerPort
  | typeof DatabasePort
  | typeof RequestContextPort
  | typeof UserServicePort
  | typeof CacheServicePort
  | typeof ConfigServicePort;

// =============================================================================
// Standard Adapter Factories
// =============================================================================

export interface LoggerMock extends Logger {
  log: Mock;
  warn: Mock;
  error: Mock;
}

export interface DatabaseMock extends Database {
  query: Mock;
  connect: Mock;
  disconnect: Mock;
}

export interface CacheServiceMock extends CacheService {
  get: Mock;
  set: Mock;
  delete: Mock;
}

/**
 * Creates a logger adapter with customizable lifetime.
 */
export function createLoggerAdapter(lifetime: Lifetime = "singleton", factory?: () => Logger) {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime,
    factory: factory ?? (() => createMockLogger()),
  });
}

/**
 * Creates a database adapter with customizable lifetime.
 */
export function createDatabaseAdapter(lifetime: Lifetime = "singleton", factory?: () => Database) {
  return createAdapter({
    provides: DatabasePort,
    requires: [],
    lifetime,
    factory: factory ?? (() => createMockDatabase()),
  });
}

/**
 * Creates a request context adapter (typically scoped).
 */
export function createRequestContextAdapter(lifetime: Lifetime = "scoped", requestId?: string) {
  return createAdapter({
    provides: RequestContextPort,
    requires: [],
    lifetime,
    factory: () => ({
      requestId: requestId ?? generateRequestId(),
      timestamp: Date.now(),
    }),
  });
}

/**
 * Creates a user service adapter with logger dependency.
 */
export function createUserServiceAdapter(
  lifetime: Lifetime = "singleton",
  factory?: (deps: { Logger: Logger }) => UserService
) {
  return createAdapter({
    provides: UserServicePort,
    requires: [LoggerPort] as const,
    lifetime,
    factory:
      factory ??
      (deps => ({
        getUser: (id: string) => {
          deps.Logger.log(`Getting user ${id}`);
          return { id, name: `User ${id}` };
        },
        createUser: (data: unknown) => {
          deps.Logger.log("Creating user");
          return { id: generateId(), ...(data as object) };
        },
      })),
  });
}

/**
 * Creates a cache service adapter.
 */
export function createCacheServiceAdapter(
  lifetime: Lifetime = "singleton",
  factory?: () => CacheService
) {
  return createAdapter({
    provides: CacheServicePort,
    requires: [],
    lifetime,
    factory: factory ?? (() => createMockCacheService()),
  });
}

/**
 * Creates a config service adapter.
 */
export function createConfigServiceAdapter(
  lifetime: Lifetime = "singleton",
  config?: Record<string, string>
) {
  const configMap = config ?? {};
  return createAdapter({
    provides: ConfigServicePort,
    requires: [],
    lifetime,
    factory: () => ({
      get: (key: string) => configMap[key],
      getRequired: (key: string) => {
        const value = configMap[key];
        if (value === undefined) {
          throw new Error(`Config key '${key}' not found`);
        }
        return value;
      },
    }),
  });
}

// =============================================================================
// Mock Factory Functions
// =============================================================================

/**
 * Creates a mock logger instance with vi.fn() methods.
 */
export function createMockLogger(): LoggerMock {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

/**
 * Creates a mock database instance with vi.fn() methods.
 */
export function createMockDatabase(): DatabaseMock {
  return {
    query: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates a mock cache service instance with vi.fn() methods.
 */
export function createMockCacheService(): CacheServiceMock {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn((key: string) => store.get(key)),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value);
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
    }),
  };
}

/**
 * Creates a mock request context with optional custom request ID.
 */
export function createMockRequestContext(requestId?: string): RequestContext {
  return {
    requestId: requestId ?? generateRequestId(),
    timestamp: Date.now(),
  };
}

// =============================================================================
// Container Presets
// =============================================================================

/**
 * Creates a minimal container with just a logger.
 */
export function createMinimalContainer() {
  const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
  return createContainer(graph, { name: "MinimalContainer" });
}

/**
 * Creates a standard container with logger, database, and cache.
 */
export function createStandardContainer() {
  const graph = GraphBuilder.create()
    .provide(createLoggerAdapter())
    .provide(createDatabaseAdapter())
    .provide(createCacheServiceAdapter())
    .build();
  return createContainer(graph, { name: "StandardContainer" });
}

/**
 * Creates a container with scoped request context support.
 */
export function createScopedContainer() {
  const graph = GraphBuilder.create()
    .provide(createLoggerAdapter())
    .provide(createRequestContextAdapter())
    .build();
  return createContainer(graph, { name: "ScopedContainer" });
}

/**
 * Creates a container with user service and dependencies.
 */
export function createUserServiceContainer() {
  const graph = GraphBuilder.create()
    .provide(createLoggerAdapter())
    .provide(createUserServiceAdapter())
    .build();
  return createContainer(graph, { name: "UserServiceContainer" });
}

// =============================================================================
// Utility Functions
// =============================================================================

let idCounter = 0;

/**
 * Generates a unique ID for testing.
 */
export function generateId(): string {
  return `id-${++idCounter}`;
}

/**
 * Generates a unique request ID.
 */
export function generateRequestId(): string {
  return `req-${++idCounter}-${Date.now()}`;
}

/**
 * Resets the ID counter (call in beforeEach).
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Creates a counting wrapper around a factory to track call counts.
 */
export function createCountingFactory<T>(baseFactory: () => T): {
  factory: () => T;
  callCount: () => number;
  reset: () => void;
} {
  let count = 0;
  return {
    factory: () => {
      count++;
      return baseFactory();
    },
    callCount: () => count,
    reset: () => {
      count = 0;
    },
  };
}

/**
 * Creates a spied factory that tracks instances.
 */
export function createSpiedFactory<T>(baseFactory: () => T): {
  factory: () => T;
  instances: T[];
  callCount: () => number;
} {
  const instances: T[] = [];
  return {
    factory: () => {
      const instance = baseFactory();
      instances.push(instance);
      return instance;
    },
    instances,
    callCount: () => instances.length,
  };
}
