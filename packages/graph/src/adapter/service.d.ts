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
import { type Port } from "@hex-di/ports";
import type { Adapter, Lifetime, ResolvedDeps } from "./types/adapter-types.js";
import type { TupleToUnion } from "../types/type-utilities.js";
import type { Singleton, EmptyRequires } from "./constants.js";
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
export declare function defineService<const TName extends string, TService>(name: TName, config: {
    factory: (deps: Record<string, unknown>) => TService;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, never, Singleton, "sync", false, EmptyRequires>
];
/**
 * Defines a sync service with clonable option.
 *
 * @overload When clonable is explicitly provided
 */
export declare function defineService<const TName extends string, TService, const TClonable extends boolean>(name: TName, config: {
    factory: (deps: Record<string, unknown>) => TService;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, never, Singleton, "sync", TClonable, EmptyRequires>
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
export declare function defineService<const TName extends string, TService, const TLifetime extends Lifetime>(name: TName, config: {
    lifetime: TLifetime;
    factory: (deps: Record<string, unknown>) => TService;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, never, TLifetime, "sync", false, EmptyRequires>
];
/**
 * Defines a sync service with custom lifetime and clonable.
 */
export declare function defineService<const TName extends string, TService, const TLifetime extends Lifetime, const TClonable extends boolean>(name: TName, config: {
    lifetime: TLifetime;
    factory: (deps: Record<string, unknown>) => TService;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, never, TLifetime, "sync", TClonable, EmptyRequires>
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
export declare function defineService<const TName extends string, TService, const TRequires extends readonly Port<unknown, string>[]>(name: TName, config: {
    requires: TRequires;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, TupleToUnion<TRequires>, Singleton, "sync", false, TRequires>
];
/**
 * Defines a sync service with dependencies and clonable.
 */
export declare function defineService<const TName extends string, TService, const TRequires extends readonly Port<unknown, string>[], const TClonable extends boolean>(name: TName, config: {
    requires: TRequires;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, TupleToUnion<TRequires>, Singleton, "sync", TClonable, TRequires>
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
export declare function defineService<const TName extends string, TService, const TRequires extends readonly Port<unknown, string>[], const TLifetime extends Lifetime>(name: TName, config: {
    requires: TRequires;
    lifetime: TLifetime;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, TupleToUnion<TRequires>, TLifetime, "sync", false, TRequires>
];
/**
 * Defines a sync service with dependencies, custom lifetime, and clonable.
 */
export declare function defineService<const TName extends string, TService, const TRequires extends readonly Port<unknown, string>[], const TLifetime extends Lifetime, const TClonable extends boolean>(name: TName, config: {
    requires: TRequires;
    lifetime: TLifetime;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, TupleToUnion<TRequires>, TLifetime, "sync", TClonable, TRequires>
];
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
export declare function defineAsyncService<const TName extends string, TService>(name: TName, config: {
    factory: (deps: Record<string, unknown>) => Promise<TService>;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, never, Singleton, "async", false, EmptyRequires>
];
/**
 * Defines an async service with clonable option.
 */
export declare function defineAsyncService<const TName extends string, TService, const TClonable extends boolean>(name: TName, config: {
    factory: (deps: Record<string, unknown>) => Promise<TService>;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, never, Singleton, "async", TClonable, EmptyRequires>
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
export declare function defineAsyncService<const TName extends string, TService, const TRequires extends readonly Port<unknown, string>[]>(name: TName, config: {
    requires: TRequires;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => Promise<TService>;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, TupleToUnion<TRequires>, Singleton, "async", false, TRequires>
];
/**
 * Defines an async service with dependencies and clonable.
 */
export declare function defineAsyncService<const TName extends string, TService, const TRequires extends readonly Port<unknown, string>[], const TClonable extends boolean>(name: TName, config: {
    requires: TRequires;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => Promise<TService>;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
}): readonly [
    Port<TService, TName>,
    Adapter<Port<TService, TName>, TupleToUnion<TRequires>, Singleton, "async", TClonable, TRequires>
];
/**
 * Maps a tuple of ports to a tuple of their service types.
 * Used to ensure constructor parameters match the resolved dependency types.
 * @internal
 */
type PortsToServices<T extends readonly Port<unknown, string>[]> = {
    [K in keyof T]: T[K] extends Port<infer S, string> ? S : never;
};
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
export declare function createClassAdapter<TProvides extends Port<TService, string>, const TRequires extends readonly Port<unknown, string>[], const TLifetime extends Lifetime, TService>(config: {
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
export declare function createClassAdapter<TProvides extends Port<TService, string>, const TRequires extends readonly Port<unknown, string>[], const TLifetime extends Lifetime, TService, const TClonable extends boolean>(config: {
    provides: TProvides;
    requires: TRequires;
    lifetime: TLifetime;
    class: new (...args: PortsToServices<TRequires>) => TService;
    clonable: TClonable;
    finalizer?: (instance: TService) => void | Promise<void>;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, "sync", TClonable, TRequires>;
export {};
