/**
 * Service Definition Helpers
 *
 * Convenience functions that combine port and adapter creation in a single step,
 * reducing boilerplate while maintaining full type safety.
 *
 * @example Basic usage (no dependencies, singleton)
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * const [LoggerPort, LoggerAdapter] = defineService<'Logger', Logger>('Logger', {
 *   factory: () => new ConsoleLogger(),
 * });
 * ```
 *
 * @example With dependencies
 * ```typescript
 * const [UserServicePort, UserServiceAdapter] = defineService<'UserService', UserService>(
 *   'UserService',
 *   {
 *     requires: [DatabasePort, LoggerPort],
 *     lifetime: 'scoped',
 *     factory: ({ Database, Logger }) => new UserServiceImpl(Database, Logger),
 *   }
 * );
 * ```
 *
 * @example Using createClassAdapter for constructor injection
 * ```typescript
 * class UserServiceImpl implements UserService {
 *   constructor(private db: Database, private logger: Logger) {}
 * }
 *
 * const UserServiceAdapter = createClassAdapter({
 *   provides: UserServicePort,
 *   requires: [DatabasePort, LoggerPort] as const,
 *   lifetime: 'scoped',
 *   class: UserServiceImpl,
 * });
 * ```
 *
 * @packageDocumentation
 */

import { createPort, type Port } from "@hex-di/ports";
import { createAdapter, createAsyncAdapter } from "./factory.js";
import type { Adapter, Lifetime, ResolvedDeps } from "./types/adapter-types.js";
import type { TupleToUnion } from "../types/type-utilities.js";
import { SINGLETON, EMPTY_REQUIRES, FALSE, SYNC } from "./constants.js";
import type { Singleton, EmptyRequires } from "./constants.js";

// =============================================================================
// Result Tuple Helper
// =============================================================================

/**
 * Creates a frozen tuple of [Port, Adapter] with the correct type.
 * This helper preserves the exact types of both elements.
 * @internal
 */
function createServiceTuple<
  TPort extends Port<unknown, string>,
  TAdapter extends Adapter<TPort, unknown, Lifetime, "sync" | "async", boolean, readonly unknown[]>,
>(port: TPort, adapter: TAdapter): readonly [TPort, TAdapter] {
  return Object.freeze([port, adapter]);
}

// =============================================================================
// defineService - Overloads
// =============================================================================

/**
 * Defines a sync service, creating both a port and adapter in one step.
 *
 * @pure No side effects - same inputs always produce the same frozen [Port, Adapter] tuple.
 *
 * This is a convenience helper that reduces boilerplate when defining services.
 * It provides sensible defaults:
 * - `requires` defaults to `[]` (no dependencies)
 * - `lifetime` defaults to `"singleton"`
 * - `clonable` defaults to `false`
 *
 * @typeParam TName - The literal string type for the port name
 * @typeParam TService - The service interface type
 *
 * @param name - Unique port name
 * @param config - Service configuration with factory (no requires/lifetime)
 * @returns A frozen tuple of [Port, Adapter]
 *
 * @example Minimal (no dependencies, singleton)
 * ```typescript
 * const [LoggerPort, LoggerAdapter] = defineService<'Logger', Logger>('Logger', {
 *   factory: () => new ConsoleLogger(),
 * });
 * ```
 */
export function defineService<const TName extends string, TService>(
  name: TName,
  config: {
    factory: (deps: Record<string, unknown>) => TService;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, never, Singleton, "sync", false, EmptyRequires>,
];

/**
 * Defines a sync service with clonable option.
 *
 * @overload When clonable is explicitly provided
 */
export function defineService<
  const TName extends string,
  TService,
  const TClonable extends boolean,
>(
  name: TName,
  config: {
    factory: (deps: Record<string, unknown>) => TService;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, never, Singleton, "sync", TClonable, EmptyRequires>,
];

/**
 * Defines a sync service with custom lifetime.
 *
 * @typeParam TName - The literal string type for the port name
 * @typeParam TService - The service interface type
 * @typeParam TLifetime - Lifetime scope
 *
 * @param name - Unique port name
 * @param config - Service configuration with lifetime
 * @returns A frozen tuple of [Port, Adapter]
 *
 * @example With custom lifetime
 * ```typescript
 * const [SessionPort, SessionAdapter] = defineService<'Session', Session>('Session', {
 *   lifetime: 'scoped',
 *   factory: () => new UserSession(),
 * });
 * ```
 */
export function defineService<
  const TName extends string,
  TService,
  const TLifetime extends Lifetime,
>(
  name: TName,
  config: {
    lifetime: TLifetime;
    factory: (deps: Record<string, unknown>) => TService;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, never, TLifetime, "sync", false, EmptyRequires>,
];

/**
 * Defines a sync service with custom lifetime and clonable.
 */
export function defineService<
  const TName extends string,
  TService,
  const TLifetime extends Lifetime,
  const TClonable extends boolean,
>(
  name: TName,
  config: {
    lifetime: TLifetime;
    factory: (deps: Record<string, unknown>) => TService;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, never, TLifetime, "sync", TClonable, EmptyRequires>,
];

/**
 * Defines a sync service with dependencies.
 *
 * @typeParam TName - The literal string type for the port name
 * @typeParam TService - The service interface type
 * @typeParam TRequires - Tuple of required port dependencies
 *
 * @param name - Unique port name
 * @param config - Service configuration with requires
 * @returns A frozen tuple of [Port, Adapter]
 *
 * @example With dependencies (singleton by default)
 * ```typescript
 * const [UserServicePort, UserServiceAdapter] = defineService<'UserService', UserService>(
 *   'UserService',
 *   {
 *     requires: [DatabasePort, LoggerPort],
 *     factory: ({ Database, Logger }) => new UserServiceImpl(Database, Logger),
 *   }
 * );
 * ```
 */
export function defineService<
  const TName extends string,
  TService,
  const TRequires extends readonly Port<unknown, string>[],
>(
  name: TName,
  config: {
    requires: TRequires;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, TupleToUnion<TRequires>, Singleton, "sync", false, TRequires>,
];

/**
 * Defines a sync service with dependencies and clonable.
 */
export function defineService<
  const TName extends string,
  TService,
  const TRequires extends readonly Port<unknown, string>[],
  const TClonable extends boolean,
>(
  name: TName,
  config: {
    requires: TRequires;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, TupleToUnion<TRequires>, Singleton, "sync", TClonable, TRequires>,
];

/**
 * Defines a sync service with dependencies and custom lifetime.
 *
 * @typeParam TName - The literal string type for the port name
 * @typeParam TService - The service interface type
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TLifetime - Lifetime scope
 *
 * @param name - Unique port name
 * @param config - Service configuration with requires and lifetime
 * @returns A frozen tuple of [Port, Adapter]
 *
 * @example Full configuration
 * ```typescript
 * const [UserServicePort, UserServiceAdapter] = defineService<'UserService', UserService>(
 *   'UserService',
 *   {
 *     requires: [DatabasePort, LoggerPort],
 *     lifetime: 'scoped',
 *     factory: ({ Database, Logger }) => new UserServiceImpl(Database, Logger),
 *   }
 * );
 * ```
 */
export function defineService<
  const TName extends string,
  TService,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
>(
  name: TName,
  config: {
    requires: TRequires;
    lifetime: TLifetime;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, TupleToUnion<TRequires>, TLifetime, "sync", false, TRequires>,
];

/**
 * Defines a sync service with dependencies, custom lifetime, and clonable.
 */
export function defineService<
  const TName extends string,
  TService,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
  const TClonable extends boolean,
>(
  name: TName,
  config: {
    requires: TRequires;
    lifetime: TLifetime;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, TupleToUnion<TRequires>, TLifetime, "sync", TClonable, TRequires>,
];

/**
 * Implementation that handles all defineService overload cases.
 *
 * The implementation uses a wide signature to accept all overload variants.
 * Type safety is ensured by the public overload signatures - the implementation
 * just needs to correctly construct the adapter at runtime.
 */
export function defineService<const TName extends string, TService>(
  name: TName,
  config: {
    requires?: readonly Port<unknown, string>[];
    lifetime?: Lifetime;
    factory: (deps: Record<string, unknown>) => TService;
    clonable?: boolean;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<
    Port<TService, TName>,
    unknown,
    Lifetime,
    "sync",
    boolean,
    readonly Port<unknown, string>[]
  >,
] {
  const port = createPort<TName, TService>(name);

  // Determine defaults using literal values
  const requires = config.requires ?? EMPTY_REQUIRES;
  const lifetime = config.lifetime ?? SINGLETON;

  // Build adapter config - createAdapter handles clonable default via its overloads
  const baseConfig = {
    provides: port,
    requires,
    lifetime,
    factory: config.factory,
  };

  // Branch based on clonable to leverage createAdapter's overloads correctly
  if (config.clonable !== undefined) {
    const adapterConfig = { ...baseConfig, clonable: config.clonable };
    const adapter =
      config.finalizer !== undefined
        ? createAdapter({ ...adapterConfig, finalizer: config.finalizer })
        : createAdapter(adapterConfig);
    return createServiceTuple(port, adapter);
  }

  // clonable is undefined - createAdapter will default to false
  const adapter =
    config.finalizer !== undefined
      ? createAdapter({ ...baseConfig, finalizer: config.finalizer })
      : createAdapter(baseConfig);
  return createServiceTuple(port, adapter);
}

// =============================================================================
// defineAsyncService - Overloads
// =============================================================================

/**
 * Defines an async service, creating both a port and adapter in one step.
 *
 * @pure No side effects - same valid inputs always produce the same frozen [Port, Adapter] tuple.
 *
 * Async services are always singletons (this is enforced by the type system).
 *
 * @typeParam TName - The literal string type for the port name
 * @typeParam TService - The service interface type
 *
 * @param name - Unique port name
 * @param config - Service configuration with async factory
 * @returns A frozen tuple of [Port, Adapter]
 *
 * @example Basic async service
 * ```typescript
 * const [ConfigPort, ConfigAdapter] = defineAsyncService<'Config', Config>('Config', {
 *   factory: async () => await loadConfigFromFile(),
 * });
 * ```
 */
export function defineAsyncService<const TName extends string, TService>(
  name: TName,
  config: {
    factory: (deps: Record<string, unknown>) => Promise<TService>;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, never, Singleton, "async", false, EmptyRequires>,
];

/**
 * Defines an async service with clonable option.
 */
export function defineAsyncService<
  const TName extends string,
  TService,
  const TClonable extends boolean,
>(
  name: TName,
  config: {
    factory: (deps: Record<string, unknown>) => Promise<TService>;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, never, Singleton, "async", TClonable, EmptyRequires>,
];

/**
 * Defines an async service with dependencies.
 *
 * Async services are always singletons (this is enforced by the type system).
 *
 * @typeParam TName - The literal string type for the port name
 * @typeParam TService - The service interface type
 * @typeParam TRequires - Tuple of required port dependencies
 *
 * @param name - Unique port name
 * @param config - Service configuration with async factory and dependencies
 * @returns A frozen tuple of [Port, Adapter]
 *
 * @example With dependencies
 * ```typescript
 * const [DatabasePort, DatabaseAdapter] = defineAsyncService<'Database', Database>(
 *   'Database',
 *   {
 *     requires: [ConfigPort],
 *     factory: async ({ Config }) => await connectToDb(Config.dbUrl),
 *   }
 * );
 * ```
 */
export function defineAsyncService<
  const TName extends string,
  TService,
  const TRequires extends readonly Port<unknown, string>[],
>(
  name: TName,
  config: {
    requires: TRequires;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => Promise<TService>;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, TupleToUnion<TRequires>, Singleton, "async", false, TRequires>,
];

/**
 * Defines an async service with dependencies and clonable.
 */
export function defineAsyncService<
  const TName extends string,
  TService,
  const TRequires extends readonly Port<unknown, string>[],
  const TClonable extends boolean,
>(
  name: TName,
  config: {
    requires: TRequires;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => Promise<TService>;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, TupleToUnion<TRequires>, Singleton, "async", TClonable, TRequires>,
];

/**
 * Implementation that handles all defineAsyncService overload cases.
 *
 * The implementation uses a wide signature to accept all overload variants.
 * Type safety is ensured by the public overload signatures.
 */
export function defineAsyncService<const TName extends string, TService>(
  name: TName,
  config: {
    requires?: readonly Port<unknown, string>[];
    factory: (deps: Record<string, unknown>) => Promise<TService>;
    clonable?: boolean;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<
    Port<TService, TName>,
    unknown,
    Singleton,
    "async",
    boolean,
    readonly Port<unknown, string>[]
  >,
] {
  const port = createPort<TName, TService>(name);

  // Determine defaults using literal values
  const requires = config.requires ?? EMPTY_REQUIRES;

  // Build adapter config - createAsyncAdapter handles clonable default via its overloads
  const baseConfig = {
    provides: port,
    requires,
    factory: config.factory,
    ...(config.finalizer !== undefined && { finalizer: config.finalizer }),
  };

  // Branch based on clonable to leverage createAsyncAdapter's overloads correctly
  if (config.clonable !== undefined) {
    const adapter = createAsyncAdapter({ ...baseConfig, clonable: config.clonable });
    return createServiceTuple(port, adapter);
  }

  // clonable is undefined - createAsyncAdapter will default to false
  const adapter = createAsyncAdapter(baseConfig);
  return createServiceTuple(port, adapter);
}

// =============================================================================
// createClassAdapter - Constructor Injection Helper
// =============================================================================

/**
 * Maps a tuple of ports to a tuple of their service types.
 * Used to ensure constructor parameters match the resolved dependency types.
 * @internal
 */
type PortsToServices<T extends readonly Port<unknown, string>[]> = {
  [K in keyof T]: T[K] extends Port<infer S, string> ? S : never;
};

/**
 * Extracts service instances from deps in the order specified by requires.
 *
 * ## Type Safety via Overloads
 *
 * TypeScript cannot infer that iterating over a tuple produces a corresponding
 * tuple. This function uses overloads to bridge the gap:
 * - The public signature returns `PortsToServices<T>` (the expected tuple type)
 * - The implementation signature returns `unknown[]` (what TypeScript can infer)
 *
 * This is type-safe because:
 * - The iteration order is guaranteed to match the requires array
 * - Each element is the service for the corresponding port
 * - The overload signatures enforce the correct relationship
 *
 * @internal
 */
function extractServicesInOrder<T extends readonly Port<unknown, string>[]>(
  deps: Record<string, unknown>,
  requires: T
): PortsToServices<T>;
function extractServicesInOrder(
  deps: Record<string, unknown>,
  requires: readonly Port<unknown, string>[]
): unknown[] {
  // Map preserves order: each position corresponds to the same position in requires
  return requires.map(port => deps[port.__portName]);
}

/**
 * Creates an adapter that instantiates a class with constructor injection.
 *
 * @pure No side effects - same inputs always produce the same frozen Adapter object.
 *
 * This helper reduces boilerplate when adapting class-based services.
 * Instead of writing a factory function that manually passes dependencies
 * to the constructor, you can specify the class directly and the adapter
 * will handle the wiring.
 *
 * ## Type Safety
 *
 * The type system verifies that:
 * 1. Constructor parameters match the services from `requires` (in order)
 * 2. The class instance type matches the port's service type
 *
 * ## Order Matters
 *
 * Dependencies are passed to the constructor **in the same order as the requires array**.
 * Ensure your constructor parameters match this order.
 *
 * @typeParam TProvides - The port type this adapter provides
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TLifetime - Lifetime scope
 * @typeParam TService - The service instance type
 *
 * @param config - Class adapter configuration
 * @returns A frozen Adapter that instantiates the class with injected dependencies
 *
 * @example No dependencies
 * ```typescript
 * class ConsoleLogger implements Logger {
 *   log(msg: string) { console.log(msg); }
 * }
 *
 * const LoggerAdapter = createClassAdapter({
 *   provides: LoggerPort,
 *   requires: [] as const,
 *   lifetime: 'singleton',
 *   class: ConsoleLogger,
 * });
 * ```
 *
 * @example With dependencies (order matters!)
 * ```typescript
 * class UserServiceImpl implements UserService {
 *   constructor(
 *     private db: Database,    // First: matches DatabasePort
 *     private logger: Logger   // Second: matches LoggerPort
 *   ) {}
 * }
 *
 * const UserServiceAdapter = createClassAdapter({
 *   provides: UserServicePort,
 *   requires: [DatabasePort, LoggerPort] as const,  // Order must match constructor
 *   lifetime: 'scoped',
 *   class: UserServiceImpl,
 * });
 * ```
 *
 * @example With finalizer
 * ```typescript
 * class DatabaseConnection implements Database {
 *   constructor(private config: Config) {}
 *   async close() { ... }
 * }
 *
 * const DatabaseAdapter = createClassAdapter({
 *   provides: DatabasePort,
 *   requires: [ConfigPort] as const,
 *   lifetime: 'singleton',
 *   class: DatabaseConnection,
 *   finalizer: (db) => db.close(),
 * });
 * ```
 */
export function createClassAdapter<
  TProvides extends Port<TService, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
  TService,
>(config: {
  provides: TProvides;
  requires: TRequires;
  lifetime: TLifetime;
  class: new (...args: PortsToServices<TRequires>) => TService;
  clonable?: undefined;
  finalizer?: (instance: TService) => void | Promise<void>;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, "sync", false, TRequires>;

/**
 * Creates a class adapter with clonable option.
 */
export function createClassAdapter<
  TProvides extends Port<TService, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
  TService,
  const TClonable extends boolean,
>(config: {
  provides: TProvides;
  requires: TRequires;
  lifetime: TLifetime;
  class: new (...args: PortsToServices<TRequires>) => TService;
  clonable: TClonable;
  finalizer?: (instance: TService) => void | Promise<void>;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, "sync", TClonable, TRequires>;

/**
 * Implementation that handles all createClassAdapter overload cases.
 *
 * ## Implementation Pattern
 *
 * This follows the same pattern as defineService - using a wide implementation
 * signature with the type safety enforced by overloads. The implementation
 * constructs the adapter object directly rather than going through createAdapter's
 * overloads, which cannot track the relationship between TService and TClass.
 *
 * @see defineService - Uses the same architectural pattern
 */
export function createClassAdapter<
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
>(config: {
  provides: Port<unknown, string>;
  requires: TRequires;
  lifetime: TLifetime;
  class: new (...args: PortsToServices<TRequires>) => unknown;
  clonable?: boolean;
  finalizer?: (instance: unknown) => void | Promise<void>;
}): Adapter<Port<unknown, string>, TupleToUnion<TRequires>, TLifetime, "sync", boolean, TRequires> {
  const ClassConstructor = config.class;

  // Create a factory that extracts dependencies in order and passes to constructor
  const factory = (deps: Record<string, unknown>): unknown => {
    // Extract services in the same order as the requires array
    // extractServicesInOrder uses overloads to provide type-safe tuple extraction
    const args = extractServicesInOrder(deps, config.requires);

    // Instantiate the class with the ordered arguments
    return new ClassConstructor(...args);
  };

  // Construct adapter directly
  const clonable = config.clonable === undefined ? FALSE : config.clonable;

  const baseAdapter = {
    provides: config.provides,
    requires: config.requires,
    lifetime: config.lifetime,
    factoryKind: SYNC,
    factory,
    clonable,
  };

  if (config.finalizer !== undefined) {
    return Object.freeze({
      ...baseAdapter,
      finalizer: config.finalizer,
    });
  }

  return Object.freeze(baseAdapter);
}
