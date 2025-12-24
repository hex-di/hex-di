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
import { createAdapter, createAsyncAdapter } from "./factory";
import type { Adapter, Lifetime, ResolvedDeps } from "./types";
import type { TupleToUnion } from "../common";

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
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, never, "singleton", "sync", readonly []>,
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
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, never, TLifetime, "sync", readonly []>,
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
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, TupleToUnion<TRequires>, "singleton", "sync", TRequires>,
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
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, TupleToUnion<TRequires>, TLifetime, "sync", TRequires>,
];

// Implementation
export function defineService<
  const TName extends string,
  TService,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
>(
  name: TName,
  config: {
    requires?: TRequires;
    lifetime?: TLifetime;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, TupleToUnion<TRequires>, TLifetime, "sync", TRequires>,
] {
  const port = createPort<TName, TService>(name);

  // Apply defaults - safe casts at boundary since we control the runtime values
  const requires = (config.requires ?? []) as TRequires;
  const lifetime = (config.lifetime ?? "singleton") as TLifetime;

  const adapterConfig = {
    provides: port,
    requires,
    lifetime,
    factory: config.factory as (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService,
  };

  const adapter =
    config.finalizer !== undefined
      ? createAdapter({ ...adapterConfig, finalizer: config.finalizer })
      : createAdapter(adapterConfig);

  return Object.freeze([port, adapter]) as readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, TupleToUnion<TRequires>, TLifetime, "sync", TRequires>,
  ];
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
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, never, "singleton", "async", readonly []>,
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
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, TupleToUnion<TRequires>, "singleton", "async", TRequires>,
];

// Implementation
export function defineAsyncService<
  const TName extends string,
  TService,
  const TRequires extends readonly Port<unknown, string>[],
>(
  name: TName,
  config: {
    requires?: TRequires;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => Promise<TService>;
    initPriority?: number;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, TupleToUnion<TRequires>, "singleton", "async", TRequires>,
] {
  const port = createPort<TName, TService>(name);

  // Apply defaults - safe cast at boundary since we control the runtime value
  const requires = (config.requires ?? []) as TRequires;

  const adapterConfig = {
    provides: port,
    requires,
    factory: config.factory as (deps: ResolvedDeps<TupleToUnion<TRequires>>) => Promise<TService>,
    ...(config.initPriority !== undefined && { initPriority: config.initPriority }),
    ...(config.finalizer !== undefined && { finalizer: config.finalizer }),
  };

  const adapter = createAsyncAdapter(adapterConfig);

  return Object.freeze([port, adapter]) as readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, TupleToUnion<TRequires>, "singleton", "async", TRequires>,
  ];
}
