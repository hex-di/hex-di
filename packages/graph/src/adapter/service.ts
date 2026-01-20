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
 * @packageDocumentation
 */

import { createPort, type Port } from "@hex-di/ports";
import { createAdapter, createAsyncAdapter } from "./factory.js";
import type { Adapter, Lifetime, ResolvedDeps } from "./types.js";
import type { TupleToUnion } from "../common/index.js";

// =============================================================================
// Literal Value Helpers
// =============================================================================

/**
 * Helper function that returns a value with its literal type preserved.
 * TypeScript infers the const type parameter from the argument.
 * @internal
 */
function literal<const T>(value: T): T {
  return value;
}

/**
 * Literal-typed constant values for defaults.
 * Using the `literal()` helper preserves exact types without `as const`.
 * @internal
 */
const SINGLETON = literal("singleton");
const EMPTY_REQUIRES = Object.freeze(literal([]));

// Type aliases for clarity
type Singleton = typeof SINGLETON;
type EmptyRequires = typeof EMPTY_REQUIRES;

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
    initPriority?: number;
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
    initPriority?: number;
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
 * @example With dependencies and priority
 * ```typescript
 * const [DatabasePort, DatabaseAdapter] = defineAsyncService<'Database', Database>(
 *   'Database',
 *   {
 *     requires: [ConfigPort],
 *     factory: async ({ Config }) => await connectToDb(Config.dbUrl),
 *     initPriority: 10, // Initialize early
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
    initPriority?: number;
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
    initPriority?: number;
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
    initPriority?: number;
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
    ...(config.initPriority !== undefined && { initPriority: config.initPriority }),
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
