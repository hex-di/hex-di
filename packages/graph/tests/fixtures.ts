/**
 * Shared test fixtures for @hex-di/graph tests.
 *
 * Consolidates common service interfaces, port definitions, and type aliases
 * to reduce duplication across test files.
 *
 * ## Fixture Selection Guide
 *
 * ### Testing Scenario → Recommended Fixtures
 *
 * | Scenario                    | Recommended Fixtures                           |
 * |-----------------------------|------------------------------------------------|
 * | Basic adapter tests         | LoggerPort, LoggerConsoleLogger       |
 * | Dependency chain tests      | DatabasePort, UserServicePort + their adapters |
 * | Cycle detection tests       | CycleA/B/C ports and adapters                  |
 * | Lifetime tests              | Adapters with different lifetimes              |
 * | Async adapter tests         | AsyncDbAsyncConfigAdapter             |
 * | Multi-adapter tests         | Use createTestAdapter() for custom needs       |
 *
 * ### Scenario Pattern → TestGraphBuilder Method
 *
 * | Pattern                     | Method                                         |
 * |-----------------------------|------------------------------------------------|
 * | Empty graph                 | TestGraphBuilder.create()                      |
 * | Pre-populated graph         | TestGraphBuilder.withAdapters([...])           |
 * | Error scenario              | TestGraphBuilder.expectError()                 |
 * | Type-level test             | Use .test-d.ts files with expectTypeOf         |
 *
 * ### Behavioral Need → test-doubles Function
 *
 * | Need                        | Function                                       |
 * |-----------------------------|------------------------------------------------|
 * | Mock adapter                | createMockAdapter()                            |
 * | Spy on factory calls        | createSpyAdapter()                             |
 * | Override in child           | createOverrideAdapter()                        |
 * | Async initialization        | createAsyncTestAdapter()                       |
 *
 * @packageDocumentation
 */

import { createAdapter, port, type Lifetime } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import { __emptyDepGraphBrand, __emptyLifetimeMapBrand } from "../src/advanced.js";
import { nextSequence } from "./utils/sequence.js";

// These imports are needed for TypeScript to name the symbol types in return type declarations.
// The symbols are used in EmptyDependencyGraph/EmptyLifetimeMap which appear in GraphBuilder types.
void __emptyDepGraphBrand;
void __emptyLifetimeMapBrand;

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

/**
 * User repository interface for integration tests.
 */
export interface UserRepository {
  findById(id: string): Promise<{ id: string; name: string; email: string } | null>;
  save(user: { name: string; email: string }): Promise<{ id: string }>;
}

/**
 * Notification service interface for integration tests.
 */
export interface NotificationService {
  notify(userId: string, message: string): Promise<void>;
}

/**
 * Full database interface for integration tests.
 * Includes query with type parameter and execute method.
 */
export interface DatabaseFull {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

/**
 * Full user service interface for integration tests.
 * Returns email and can return null.
 */
export interface UserServiceFull {
  getUser(id: string): Promise<{ id: string; name: string; email: string } | null>;
  createUser(name: string, email: string): Promise<{ id: string }>;
}

/**
 * Full cache service interface for integration tests.
 * Includes ttl and invalidate.
 */
export interface CacheServiceFull {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  invalidate(key: string): void;
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
export const LoggerPort = port<Logger>()({ name: "Logger" });

/**
 * Database port for testing.
 */
export const DatabasePort = port<Database>()({ name: "Database" });

/**
 * User service port for testing.
 */
export const UserServicePort = port<UserService>()({ name: "UserService" });

/**
 * Configuration port for testing.
 */
export const ConfigPort = port<ConfigService>()({ name: "Config" });

/**
 * Cache port for testing.
 */
export const CachePort = port<CacheService>()({ name: "Cache" });

/**
 * Email port for testing.
 */
export const EmailPort = port<EmailService>()({ name: "Email" });

/**
 * Alias for EmailPort - used by integration tests.
 */
export const EmailServicePort = EmailPort;

/**
 * Config port (strict) for testing - always returns a value.
 */
export const ConfigPortStrict = port<ConfigServiceStrict>()({ name: "Config" });

/**
 * Cache port (simple) for testing - non-generic signatures.
 */
export const CachePortSimple = port<CacheServiceSimple>()({ name: "Cache" });

/**
 * Logger port (with error) for integration tests.
 */
export const LoggerWithErrorPort = port<LoggerWithError>()({ name: "Logger" });

/**
 * Config port (with typed getters) for integration tests.
 */
export const ConfigWithTypesPort = port<ConfigWithTypes>()({ name: "Config" });

/**
 * User repository port for integration tests.
 */
export const UserRepositoryPort = port<UserRepository>()({ name: "UserRepository" });

/**
 * Notification service port for integration tests.
 */
export const NotificationServicePort = port<NotificationService>()({
  name: "NotificationService",
});

/**
 * Full database port for integration tests.
 */
export const DatabaseFullPort = port<DatabaseFull>()({ name: "Database" });

/**
 * Full user service port for integration tests.
 */
export const UserServiceFullPort = port<UserServiceFull>()({ name: "UserService" });

/**
 * Full cache port for integration tests.
 */
export const CacheFullPort = port<CacheServiceFull>()({ name: "Cache" });

// =============================================================================
// Cycle Testing Ports
// =============================================================================

/**
 * Generic ports for cycle detection tests.
 * Named A/B/C/D to clearly show dependency chains.
 */
export const PortA = port<ServiceA>()({ name: "A" });
export const PortB = port<ServiceB>()({ name: "B" });
export const PortC = port<ServiceC>()({ name: "C" });
export const PortD = port<ServiceD>()({ name: "D" });

// =============================================================================
// Lifetime Testing Ports
// =============================================================================

/**
 * Request context port for scoped lifetime testing.
 */
export const RequestContextPort = port<RequestContext>()({ name: "RequestContext" });

// =============================================================================
// Interface Aliases (for integration test compatibility)
// =============================================================================

/**
 * Alias for CacheService - used by integration tests.
 */
export type Cache = CacheService;

/**
 * Alias for ConfigWithTypes - used by integration tests.
 */
export type Config = ConfigWithTypes;

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
export type UserRepositoryPortType = typeof UserRepositoryPort;
export type NotificationServicePortType = typeof NotificationServicePort;
export type PortAType = typeof PortA;
export type PortBType = typeof PortB;
export type PortCType = typeof PortC;
export type PortDType = typeof PortD;
export type RequestContextPortType = typeof RequestContextPort;

// =============================================================================
// Standard Adapter Constants
// =============================================================================
//
// These constant adapters are exported for:
// 1. Type-level tests (.test-d.ts files) that need stable type inference
// 2. Tests that verify adapter identity (same reference)
// 3. Backward compatibility with existing test code
//
// For tests that need fresh adapter instances each time, use the factory
// functions below (e.g., createLoggerAdapter(), createDatabaseAdapter()).
//

/**
 * Standard logger adapter constant - singleton with no dependencies.
 * Use this when you need a stable adapter reference or for type-level tests.
 */
export const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

/**
 * Standard database adapter constant - singleton that depends on Logger.
 * Use this when you need a stable adapter reference or for type-level tests.
 */
export const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort] as const,
  lifetime: "singleton",
  factory: () => ({ query: async () => ({}) }),
});

/**
 * Standard user service adapter constant - scoped that depends on Logger and Database.
 * Use this when you need a stable adapter reference or for type-level tests.
 */
export const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort] as const,
  lifetime: "scoped",
  factory: () => ({
    getUser: async (id: string) => ({ id, name: "Test User" }),
  }),
});

/**
 * Standard config adapter constant - async adapter.
 * Use this when you need a stable adapter reference or for type-level tests.
 */
export const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [] as const,
  factory: async () => ({
    get: () => undefined,
  }),
});

/**
 * Standard cache adapter constant - singleton with no dependencies.
 * Use this when you need a stable adapter reference or for type-level tests.
 */
export const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [] as const,
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

/**
 * Standard request context adapter constant - transient lifetime.
 * Use for captive dependency testing.
 */
export const RequestContextAdapterTransient = createAdapter({
  provides: RequestContextPort,
  requires: [] as const,
  lifetime: "transient",
  factory: () => ({ requestId: `req-${nextSequence()}` }),
});

/**
 * Standard request context adapter constant - scoped lifetime.
 * Use for captive dependency testing.
 */
export const RequestContextAdapterScoped = createAdapter({
  provides: RequestContextPort,
  requires: [] as const,
  lifetime: "scoped",
  factory: () => ({ requestId: `req-${nextSequence()}` }),
});

// =============================================================================
// Sample Adapter Factory Functions
// =============================================================================

/**
 * Creates a logger adapter with no dependencies for testing.
 * Each call returns a fresh adapter instance.
 */
export function createLoggerAdapter() {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: () => {} }),
  });
}

/**
 * Creates a database adapter that depends on Logger for testing.
 * Each call returns a fresh adapter instance.
 */
export function createDatabaseAdapter() {
  return createAdapter({
    provides: DatabasePort,
    requires: [LoggerPort],
    lifetime: "singleton",
    factory: () => ({ query: async () => ({}) }),
  });
}

/**
 * Creates a UserService adapter that depends on Database and Logger for testing.
 * Each call returns a fresh adapter instance.
 */
export function createUserServiceAdapter() {
  return createAdapter({
    provides: UserServicePort,
    requires: [DatabasePort, LoggerPort],
    lifetime: "scoped",
    factory: () => ({
      getUser: async (id: string) => ({ id, name: "Test User" }),
    }),
  });
}

/**
 * Creates a Config adapter (async) for testing.
 * Each call returns a fresh adapter instance.
 */
export function createConfigAdapter() {
  return createAdapter({
    provides: ConfigPort,
    requires: [],
    factory: async () => ({
      get: () => undefined,
    }),
  });
}

/**
 * Creates a Cache adapter for testing.
 * Each call returns a fresh adapter instance with its own isolated store.
 */
export function createCacheAdapter() {
  return createAdapter({
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
}

// =============================================================================
// Lifetime Testing Adapter Factory Functions
// =============================================================================

/**
 * Creates a request context adapter (transient) for captive dependency testing.
 * Each call returns a fresh adapter instance.
 */
export function createRequestContextAdapterTransient() {
  return createAdapter({
    provides: RequestContextPort,
    requires: [],
    lifetime: "transient",
    factory: () => ({ requestId: `req-${nextSequence()}` }),
  });
}

/**
 * Creates a request context adapter (scoped) for captive dependency testing.
 * Each call returns a fresh adapter instance.
 */
export function createRequestContextAdapterScoped() {
  return createAdapter({
    provides: RequestContextPort,
    requires: [],
    lifetime: "scoped",
    factory: () => ({ requestId: `req-${nextSequence()}` }),
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
// Advanced Test Scenario Builders
// =============================================================================
//
// Note: Simple graph builders (createSimpleGraph, createThreeLevelGraph,
// createDiamondGraph, createLargeGraph) have been consolidated into
// TestGraphBuilder static methods:
//   - TestGraphBuilder.chain(2)   -> simple graph
//   - TestGraphBuilder.chain(3)   -> three-level graph
//   - TestGraphBuilder.diamond()  -> diamond pattern
//   - TestGraphBuilder.flat(n)    -> large graph with independent adapters
//

/**
 * Creates a multi-merge scenario with multiple independent graphs.
 * Useful for testing GraphBuilder.merge() with 3+ graphs.
 */
export function createMultiMergeScenario() {
  // Graph 1: Logger
  const graph1 = GraphBuilder.create().provide(createLoggerAdapter());

  // Graph 2: Database (depends on Logger)
  const graph2 = GraphBuilder.create().provide(createDatabaseAdapter());

  // Graph 3: UserService (depends on both)
  const graph3 = GraphBuilder.create().provide(createUserServiceAdapter());

  // Graph 4: Config (independent)
  const graph4 = GraphBuilder.create().provide(createConfigAdapter());

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
// Parent-Child Testing Utilities
// =============================================================================

/**
 * Validates whether an adapter is a valid override for a parent graph.
 *
 * An override is valid if the parent graph provides an adapter for the same port.
 * This helper catches invalid overrides at test time rather than at runtime.
 *
 * @param parent - The parent graph or builder with adapters
 * @param adapter - The adapter to validate as an override
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```typescript
 * const result = validateOverride(parentGraph, LoggerOverrideAdapter);
 * if (!result.valid) {
 *   console.error(result.error); // "Port 'Logger' is not provided by parent graph"
 * }
 * ```
 */
export function validateOverride(
  parent: { adapters: readonly { provides: { __portName: string } }[] },
  adapter: { provides: { __portName: string } }
): { valid: boolean; error?: string } {
  const overridePortName = adapter.provides.__portName;
  const parentPortNames = new Set(parent.adapters.map(a => a.provides.__portName));

  if (!parentPortNames.has(overridePortName)) {
    return {
      valid: false,
      error: `Port '${overridePortName}' is not provided by parent graph. Available ports: ${[...parentPortNames].join(", ") || "(none)"}`,
    };
  }

  return { valid: true };
}

// =============================================================================
// Re-export Test Doubles
// =============================================================================

export * from "./test-doubles.js";
