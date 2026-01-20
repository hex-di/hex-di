/**
 * Shared test fixtures for @hex-di/graph tests.
 *
 * Consolidates common service interfaces, port definitions, and type aliases
 * to reduce duplication across test files.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import { createAdapter, createAsyncAdapter, GraphBuilder, type Lifetime } from "../src/index.js";

// =============================================================================
// Service Interfaces
// =============================================================================

/**
 * Logger service interface for testing.
 */
export interface Logger {
  log(message: string): void;
}

/**
 * Database service interface for testing.
 */
export interface Database {
  query(sql: string): Promise<unknown>;
}

/**
 * User service interface for testing.
 */
export interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

/**
 * Configuration service interface for testing.
 */
export interface ConfigService {
  get(key: string): string | undefined;
}

/**
 * Cache service interface for testing.
 */
export interface CacheService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

/**
 * Email service interface for testing.
 */
export interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

// =============================================================================
// Interface Variants (for different test needs)
// =============================================================================

/**
 * ConfigService variant that always returns a value (no undefined).
 * Use when tests expect guaranteed config values.
 */
export interface ConfigServiceStrict {
  get(key: string): string;
}

/**
 * CacheService variant with simpler signature.
 * Use for basic cache testing without generics.
 */
export interface CacheServiceSimple {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

/**
 * Logger variant with error method for integration tests.
 * Use when tests need error logging capabilities.
 */
export interface LoggerWithError {
  log(message: string): void;
  error(message: string, error?: Error): void;
}

/**
 * Config variant with typed getters for integration tests.
 * Use when tests need numeric configuration values.
 */
export interface ConfigWithTypes {
  get(key: string): string;
  getNumber(key: string): number;
}

// =============================================================================
// Cycle Testing Interfaces
// =============================================================================

/**
 * Generic services for cycle detection tests.
 * Named A/B/C/D to clearly show dependency chains.
 */
export interface ServiceA {
  doA(): void;
}

export interface ServiceB {
  doB(): void;
}

export interface ServiceC {
  doC(): void;
}

export interface ServiceD {
  doD(): void;
}

// =============================================================================
// Lifetime Testing Interfaces
// =============================================================================

/**
 * Request context for scoped lifetime testing.
 */
export interface RequestContext {
  requestId: string;
}

// =============================================================================
// Port Definitions
// =============================================================================

/**
 * Logger port for testing.
 */
export const LoggerPort = createPort<"Logger", Logger>("Logger");

/**
 * Database port for testing.
 */
export const DatabasePort = createPort<"Database", Database>("Database");

/**
 * User service port for testing.
 */
export const UserServicePort = createPort<"UserService", UserService>("UserService");

/**
 * Configuration port for testing.
 */
export const ConfigPort = createPort<"Config", ConfigService>("Config");

/**
 * Cache port for testing.
 */
export const CachePort = createPort<"Cache", CacheService>("Cache");

/**
 * Email port for testing.
 */
export const EmailPort = createPort<"Email", EmailService>("Email");

/**
 * Config port (strict) for testing - always returns a value.
 */
export const ConfigPortStrict = createPort<"Config", ConfigServiceStrict>("Config");

/**
 * Cache port (simple) for testing - non-generic signatures.
 */
export const CachePortSimple = createPort<"Cache", CacheServiceSimple>("Cache");

/**
 * Logger port (with error) for integration tests.
 */
export const LoggerWithErrorPort = createPort<"Logger", LoggerWithError>("Logger");

/**
 * Config port (with typed getters) for integration tests.
 */
export const ConfigWithTypesPort = createPort<"Config", ConfigWithTypes>("Config");

// =============================================================================
// Cycle Testing Ports
// =============================================================================

/**
 * Generic ports for cycle detection tests.
 * Named A/B/C/D to clearly show dependency chains.
 */
export const PortA = createPort<"A", ServiceA>("A");
export const PortB = createPort<"B", ServiceB>("B");
export const PortC = createPort<"C", ServiceC>("C");
export const PortD = createPort<"D", ServiceD>("D");

// =============================================================================
// Lifetime Testing Ports
// =============================================================================

/**
 * Request context port for scoped lifetime testing.
 */
export const RequestContextPort = createPort<"RequestContext", RequestContext>("RequestContext");

// =============================================================================
// Port Type Aliases
// =============================================================================

export type LoggerPortType = typeof LoggerPort;
export type DatabasePortType = typeof DatabasePort;
export type UserServicePortType = typeof UserServicePort;
export type ConfigPortType = typeof ConfigPort;
export type CachePortType = typeof CachePort;
export type EmailPortType = typeof EmailPort;
export type ConfigPortStrictType = typeof ConfigPortStrict;
export type CachePortSimpleType = typeof CachePortSimple;
export type LoggerWithErrorPortType = typeof LoggerWithErrorPort;
export type ConfigWithTypesPortType = typeof ConfigWithTypesPort;
export type PortAType = typeof PortA;
export type PortBType = typeof PortB;
export type PortCType = typeof PortC;
export type PortDType = typeof PortD;
export type RequestContextPortType = typeof RequestContextPort;

// =============================================================================
// Sample Adapters
// =============================================================================

/**
 * Logger adapter with no dependencies for testing.
 */
export const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

/**
 * Database adapter that depends on Logger for testing.
 */
export const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: () => ({ query: async () => ({}) }),
});

/**
 * UserService adapter that depends on Database and Logger for testing.
 */
export const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort],
  lifetime: "scoped",
  factory: () => ({
    getUser: async (id: string) => ({ id, name: "Test User" }),
  }),
});

/**
 * Config adapter (async) for testing.
 */
export const ConfigAdapter = createAsyncAdapter({
  provides: ConfigPort,
  requires: [],
  factory: async () => ({
    get: () => undefined,
  }),
  initPriority: 10,
});

/**
 * Cache adapter for testing.
 */
export const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [],
  lifetime: "singleton",
  factory: () => {
    const store = new Map<string, unknown>();
    return {
      get: <T>(key: string) => store.get(key) as T | undefined,
      set: <T>(key: string, value: T) => {
        store.set(key, value);
      },
    };
  },
});

// =============================================================================
// Lifetime Testing Adapters
// =============================================================================

/**
 * Request context adapter (transient) for captive dependency testing.
 */
export const RequestContextAdapterTransient = createAdapter({
  provides: RequestContextPort,
  requires: [],
  lifetime: "transient",
  factory: () => ({ requestId: `req-${Date.now()}` }),
});

/**
 * Request context adapter (scoped) for captive dependency testing.
 */
export const RequestContextAdapterScoped = createAdapter({
  provides: RequestContextPort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({ requestId: `req-${Date.now()}` }),
});

// =============================================================================
// Generic Adapter Factory
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
  port: ReturnType<typeof createPort<TName, TService>>,
  options: MockAdapterOptions<TService> = {}
) {
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

  if (isAsync) {
    return createAsyncAdapter({
      provides: port,
      requires: [],
      clonable,
      factory: async () => stubImplementation,
    });
  }

  return createAdapter({
    provides: port,
    requires: [],
    lifetime,
    clonable,
    factory: () => stubImplementation,
  });
}

// =============================================================================
// Adapter Factory Functions
// =============================================================================

/**
 * Creates a logger adapter with custom configuration.
 */
export function createLoggerAdapterWith(
  config: {
    lifetime?: Lifetime;
    implementation?: Partial<Logger>;
  } = {}
) {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: config.lifetime ?? "singleton",
    factory: () => ({
      log: config.implementation?.log ?? (() => {}),
    }),
  });
}

/**
 * Creates a database adapter with custom configuration.
 */
export function createDatabaseAdapterWith(
  config: {
    lifetime?: Lifetime;
    returnValue?: unknown;
    requiresLogger?: boolean;
  } = {}
) {
  const requires = config.requiresLogger !== false ? [LoggerPort] : [];
  return createAdapter({
    provides: DatabasePort,
    requires,
    lifetime: config.lifetime ?? "singleton",
    factory: () => ({
      query: async () => config.returnValue ?? {},
    }),
  });
}

/**
 * Creates a user service adapter with custom configuration.
 */
export function createUserServiceAdapterWith(
  config: {
    lifetime?: Lifetime;
    user?: { id: string; name: string };
  } = {}
) {
  return createAdapter({
    provides: UserServicePort,
    requires: [DatabasePort, LoggerPort],
    lifetime: config.lifetime ?? "scoped",
    factory: () => ({
      getUser: async (id: string) => config.user ?? { id, name: "Test User" },
    }),
  });
}

// =============================================================================
// Pre-built Graph Scenarios
// =============================================================================

/**
 * Simple two-adapter graph: Logger <- Database
 */
export function createSimpleGraph() {
  return GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
}

/**
 * Three-level dependency chain: Logger <- Database <- UserService
 */
export function createThreeLevelGraph() {
  return GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(DatabaseAdapter)
    .provide(UserServiceAdapter);
}

/**
 * Diamond dependency pattern for complex testing.
 * A <- B, C; B, C <- D
 */
export function createDiamondGraph() {
  const AdapterA = createAdapter({
    provides: PortA,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ doA: () => {} }),
  });

  const AdapterB = createAdapter({
    provides: PortB,
    requires: [PortA],
    lifetime: "singleton",
    factory: () => ({ doB: () => {} }),
  });

  const AdapterC = createAdapter({
    provides: PortC,
    requires: [PortA],
    lifetime: "singleton",
    factory: () => ({ doC: () => {} }),
  });

  const AdapterD = createAdapter({
    provides: PortD,
    requires: [PortB, PortC],
    lifetime: "singleton",
    factory: () => ({ doD: () => {} }),
  });

  const graph = GraphBuilder.create()
    .provide(AdapterA)
    .provide(AdapterB)
    .provide(AdapterC)
    .provide(AdapterD);

  return { AdapterA, AdapterB, AdapterC, AdapterD, graph };
}

// =============================================================================
// Advanced Test Scenario Builders
// =============================================================================

/**
 * Creates a large graph with many independent adapters.
 * Each adapter has no dependencies, allowing parallel resolution.
 *
 * @param count - Number of adapters (default: 20)
 */
export function createLargeGraph(count = 20) {
  type IndependentService = { execute(): void };

  const adapters: Array<ReturnType<typeof createAdapter>> = [];

  for (let i = 0; i < count; i++) {
    const port = createPort<`S${number}`, IndependentService>(`S${i}`);
    const adapter = createAdapter({
      provides: port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ execute: () => {} }),
    });
    adapters.push(adapter);
  }

  const builder = GraphBuilder.create().provideMany(adapters);

  return { adapters, builder, build: () => builder.build() };
}

/**
 * Creates a multi-merge scenario with multiple independent graphs.
 * Useful for testing GraphBuilder.merge() with 3+ graphs.
 */
export function createMultiMergeScenario() {
  // Graph 1: Logger
  const graph1 = GraphBuilder.create().provide(LoggerAdapter);

  // Graph 2: Database (depends on Logger)
  const graph2 = GraphBuilder.create().provide(DatabaseAdapter);

  // Graph 3: UserService (depends on both)
  const graph3 = GraphBuilder.create().provide(UserServiceAdapter);

  // Graph 4: Config (independent)
  const graph4 = GraphBuilder.create().provide(ConfigAdapter);

  return {
    graph1,
    graph2,
    graph3,
    graph4,
    mergeAll: () => graph1.merge(graph2).merge(graph3).merge(graph4),
  };
}

/**
 * Creates a graph with mixed lifetime adapters.
 * Includes singleton, scoped, and transient adapters.
 */
export function createMixedLifetimeGraph() {
  const singletonAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: () => {} }),
  });

  const scopedAdapter = createAdapter({
    provides: DatabasePort,
    requires: [LoggerPort],
    lifetime: "scoped",
    factory: () => ({ query: async () => ({}) }),
  });

  const transientAdapter = createAdapter({
    provides: UserServicePort,
    requires: [LoggerPort, DatabasePort],
    lifetime: "transient",
    factory: () => ({ getUser: async (id: string) => ({ id, name: "Test" }) }),
  });

  const builder = GraphBuilder.create()
    .provide(singletonAdapter)
    .provide(scopedAdapter)
    .provide(transientAdapter);

  return {
    singletonAdapter,
    scopedAdapter,
    transientAdapter,
    builder,
    build: () => builder.build(),
  };
}

// =============================================================================
// Re-export Test Doubles
// =============================================================================

export * from "./test-doubles.js";
