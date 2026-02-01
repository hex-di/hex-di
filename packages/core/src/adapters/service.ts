/**
 * Service Definition Helpers
 *
 * Convenience functions that combine port and adapter creation in a single step,
 * reducing boilerplate while maintaining full type safety.
 *
 * @packageDocumentation
 */

import { createPort } from "../ports/factory.js";
import type { Port } from "../ports/types.js";
import { createAdapter, createAsyncAdapter } from "./factory.js";
import type { Adapter, Lifetime, ResolvedDeps } from "./types.js";
import type { TupleToUnion } from "../utils/type-utilities.js";
import { SINGLETON, EMPTY_REQUIRES, FALSE, SYNC } from "./constants.js";
import { ServiceBuilder } from "./builder.js";
import type { Singleton, EmptyRequires } from "./constants.js";

// =============================================================================
// Result Tuple Helper
// =============================================================================

/**
 * Creates a frozen tuple of [Port, Adapter] with the correct type.
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
 * Returns a fluent builder for defining a service.
 *
 * This curried overload enables partial type application: specify the service type
 * explicitly, and the port name is inferred from the argument.
 *
 * @typeParam TService - The service interface type (explicitly provided)
 * @returns A function that accepts the port name and returns a ServiceBuilder
 *
 * @example
 * ```typescript
 * const [LoggerPort, LoggerAdapter] = defineService<Logger>()('Logger')
 *   .singleton()
 *   .factory(() => new ConsoleLogger());
 *
 * const [UserServicePort, UserServiceAdapter] = defineService<UserService>()('UserService')
 *   .scoped()
 *   .requires(LoggerPort, DatabasePort)
 *   .factory(({ Logger, Database }) => new UserServiceImpl(Logger, Database));
 * ```
 */
export function defineService<TService>(): <const TName extends string>(
  name: TName
) => ServiceBuilder<TService, TName, readonly [], "singleton">;

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
 */
export function defineService<const TName extends string, TService>(
  name?: TName,
  config?: {
    requires?: readonly Port<unknown, string>[];
    lifetime?: Lifetime;
    factory: (deps: Record<string, unknown>) => TService;
    clonable?: boolean;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): unknown {
  // Builder overload: defineService<TService>() returns a curried builder factory
  if (name === undefined) {
    return ServiceBuilder.create<TService>();
  }

  // Config-based overloads: defineService(name, config) returns [Port, Adapter]
  // Config is guaranteed by the overload signatures when name is provided
  if (config === undefined) {
    throw new Error("defineService requires config when name is provided");
  }

  const port = createPort<TName, TService>(name);

  const requires = config.requires ?? EMPTY_REQUIRES;
  const lifetime = config.lifetime ?? SINGLETON;

  const baseConfig = {
    provides: port,
    requires,
    lifetime,
    factory: config.factory,
  };

  if (config.clonable !== undefined) {
    const adapterConfig = { ...baseConfig, clonable: config.clonable };
    const adapter =
      config.finalizer !== undefined
        ? createAdapter({ ...adapterConfig, finalizer: config.finalizer })
        : createAdapter(adapterConfig);
    return createServiceTuple(port, adapter);
  }

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

  const requires = config.requires ?? EMPTY_REQUIRES;

  const baseConfig = {
    provides: port,
    requires,
    factory: config.factory,
    ...(config.finalizer !== undefined && { finalizer: config.finalizer }),
  };

  if (config.clonable !== undefined) {
    const adapter = createAsyncAdapter({ ...baseConfig, clonable: config.clonable });
    return createServiceTuple(port, adapter);
  }

  const adapter = createAsyncAdapter(baseConfig);
  return createServiceTuple(port, adapter);
}

// =============================================================================
// createClassAdapter - Constructor Injection Helper
// =============================================================================

/**
 * Maps a tuple of ports to a tuple of their service types.
 * @internal
 */
type PortsToServices<T extends readonly Port<unknown, string>[]> = {
  [K in keyof T]: T[K] extends Port<infer S, string> ? S : never;
};

/**
 * Extracts service instances from deps in the order specified by requires.
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
  return requires.map(port => deps[port.__portName]);
}

/**
 * Creates an adapter that instantiates a class with constructor injection.
 *
 * This helper reduces boilerplate when adapting class-based services.
 * Instead of writing a factory function that manually passes dependencies
 * to the constructor, you can specify the class directly and the adapter
 * will handle the wiring.
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

  const factory = (deps: Record<string, unknown>): unknown => {
    const args = extractServicesInOrder(deps, config.requires);
    return new ClassConstructor(...args);
  };

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
