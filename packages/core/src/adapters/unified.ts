/**
 * Unified createAdapter API.
 *
 * This module contains the unified `createAdapter()` function that accepts
 * both factory functions and class constructors through a single API.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "../ports/types.js";
import type { Adapter, Lifetime, ResolvedDeps, PortDeps } from "./types.js";
import type { TupleToUnion } from "../utils/type-utilities.js";
import type { IsAsyncFactory, EnforceAsyncLifetime } from "./unified-types.js";
import {
  SYNC,
  ASYNC,
  SINGLETON,
  FALSE,
  EMPTY_REQUIRES,
  type Sync,
  type Async,
  type Singleton,
  type False,
  type EmptyRequires,
} from "./constants.js";

// Re-export types for use by consumers
export type {
  BothFactoryAndClassError,
  NeitherFactoryNorClassError,
  AsyncLifetimeError,
  BaseUnifiedConfig,
  FactoryConfig,
  ClassConfig,
} from "./unified-types.js";

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Maps a tuple of ports to a tuple of their service types.
 *
 * This helper is used to type constructor parameters for class-based adapters.
 * The order of service types matches the order of ports in the requires array.
 *
 * @typeParam T - Tuple of Port types
 *
 * @example
 * ```typescript
 * type Ports = [typeof LoggerPort, typeof DatabasePort];
 * type Services = PortsToServices<Ports>;
 * // [Logger, Database]
 * ```
 *
 * @internal
 */
export type PortsToServices<T extends readonly Port<unknown, string>[]> = {
  [K in keyof T]: T[K] extends Port<infer S, string> ? S : never;
};

// IsAsyncFactory is imported from unified-types.ts

// =============================================================================
// Runtime Helpers
// =============================================================================

/**
 * Extracts service instances from dependency object in port array order.
 *
 * This helper maps the requires tuple to an array of service instances
 * in the same order as the ports appear in the tuple. Used for class
 * constructor injection where parameters must match requires array order.
 *
 * @param deps - Object with port names as keys, service instances as values
 * @param requires - Tuple of required ports
 * @returns Array of service instances in requires array order
 *
 * @internal
 */
function extractServicesInOrder(
  deps: Record<string, unknown>,
  requires: readonly Port<unknown, string>[]
): unknown[] {
  return requires.map(port => deps[port.__portName]);
}

// =============================================================================
// Runtime Validation
// =============================================================================

/**
 * Valid lifetime values for runtime validation.
 * @internal
 */
const VALID_LIFETIMES = new Set(["singleton", "scoped", "transient"]);

/**
 * Type representing a port-like object with a __portName property.
 * @internal
 */
interface PortLike {
  readonly __portName: string;
}

/**
 * Type guard to check if a value is a port-like object.
 *
 * @param value - The value to check
 * @returns True if value is a port-like object with string __portName
 *
 * @internal
 */
function isPortLike(value: unknown): value is PortLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("__portName" in value)) {
    return false;
  }
  return typeof value.__portName === "string";
}

/**
 * Validates adapter configuration at runtime.
 *
 * @param config - The adapter configuration to validate
 * @param isAsync - Whether this is an async adapter (affects lifetime validation)
 * @throws {TypeError} If any configuration field is invalid
 *
 * @internal
 */
function assertValidAdapterConfig(
  config: {
    provides?: unknown;
    requires?: unknown;
    lifetime?: unknown;
    factory?: unknown;
    finalizer?: unknown;
  },
  isAsync: boolean
): void {
  // Validate 'provides' - must be a Port object
  if (config.provides === null || config.provides === undefined) {
    throw new TypeError(
      "ERROR[HEX010]: Invalid adapter config: 'provides' is required. " +
        "Expected a Port created with createPort()."
    );
  }

  if (!isPortLike(config.provides)) {
    throw new TypeError(
      "ERROR[HEX011]: Invalid adapter config: 'provides' must be a Port object with __portName. " +
        `Got: ${typeof config.provides}. ` +
        "Create ports using createPort() from @hex-di/core."
    );
  }

  const providesPort = config.provides;

  // Validate 'requires' - must be an array of Port objects
  if (!Array.isArray(config.requires)) {
    throw new TypeError(
      "ERROR[HEX012]: Invalid adapter config: 'requires' must be an array. " +
        `Got: ${typeof config.requires}. ` +
        "Use [] for no dependencies or [PortA, PortB] for dependencies."
    );
  }

  const requires: PortLike[] = [];
  for (let i = 0; i < config.requires.length; i++) {
    const req: unknown = config.requires[i];
    if (!isPortLike(req)) {
      throw new TypeError(
        `ERROR[HEX013]: Invalid adapter config: 'requires[${i}]' must be a Port object with __portName. ` +
          `Got: ${req === null ? "null" : typeof req}. ` +
          "All elements in requires must be Ports created with createPort()."
      );
    }
    requires.push(req);
  }

  // Validate 'lifetime' - must be valid lifetime string (sync adapters only)
  if (!isAsync) {
    if (typeof config.lifetime !== "string") {
      throw new TypeError(
        "ERROR[HEX014]: Invalid adapter config: 'lifetime' must be a string. " +
          `Got: ${typeof config.lifetime}. ` +
          'Valid values: "singleton", "scoped", "transient", "request".'
      );
    }

    if (!VALID_LIFETIMES.has(config.lifetime)) {
      throw new TypeError(
        `ERROR[HEX015]: Invalid adapter config: 'lifetime' must be "singleton", "scoped", "transient", or "request". ` +
          `Got: "${config.lifetime}".`
      );
    }
  }

  // Validate 'factory' - must be a function
  if (typeof config.factory !== "function") {
    throw new TypeError(
      "ERROR[HEX016]: Invalid adapter config: 'factory' must be a function. " +
        `Got: ${typeof config.factory}. ` +
        "The factory function receives resolved dependencies and returns the service instance."
    );
  }

  // Validate no duplicate ports in requires
  const requiresNames = new Set<string>();
  for (const port of requires) {
    if (requiresNames.has(port.__portName)) {
      throw new TypeError(
        `ERROR[HEX017]: Invalid adapter config: Duplicate port '${port.__portName}' in requires array. ` +
          "Each dependency should appear only once."
      );
    }
    requiresNames.add(port.__portName);
  }

  // Self-dependency check
  if (requires.some(p => p.__portName === providesPort.__portName)) {
    throw new TypeError(
      `ERROR[HEX006]: Invalid adapter config: Adapter cannot require its own port '${providesPort.__portName}'. ` +
        "This would create a circular dependency."
    );
  }

  // Validate 'finalizer' - must be a function if provided
  if (config.finalizer !== undefined && typeof config.finalizer !== "function") {
    throw new TypeError(
      "ERROR[HEX018]: Invalid adapter config: 'finalizer' must be a function. " +
        `Got: ${typeof config.finalizer}. ` +
        "The finalizer function is called with the service instance when the container is disposed."
    );
  }
}

// =============================================================================
// Factory-based createAdapter overloads
// =============================================================================

/**
 * Creates an adapter with a factory function, all defaults applied.
 *
 * @overload
 * Factory with no requires, no lifetime, no clonable - all defaults applied.
 * Defaults: `requires: []`, `lifetime: "singleton"`, `clonable: false`
 *
 * For async factories (returning Promise), automatically uses:
 * - `factoryKind: "async"`
 * - `lifetime: "singleton"` (enforced)
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TFactory - The factory function type
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  TFactory extends (
    deps: ResolvedDeps<never>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  readonly provides: TProvides;
  readonly factory: TFactory;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  requires?: undefined;
  lifetime?: undefined;
  clonable?: undefined;
}): Adapter<
  TProvides,
  never,
  Singleton,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  False,
  EmptyRequires
>;

/**
 * Creates an adapter with a factory function and explicit requires.
 *
 * @overload
 * Factory with explicit requires (no lifetime, no clonable).
 * Defaults: `lifetime: "singleton"`, `clonable: false`
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TFactory - The factory function type
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  TFactory extends (
    deps: PortDeps<TRequires>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly factory: TFactory;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  lifetime?: undefined;
  clonable?: undefined;
}): Adapter<
  TProvides,
  TupleToUnion<TRequires>,
  Singleton,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  False,
  TRequires
>;

/**
 * Creates an adapter with a factory function and explicit lifetime (no dependencies).
 *
 * @overload
 * Factory with explicit lifetime, no dependencies.
 * Defaults: `requires: []`, `clonable: false`
 *
 * **Async Constraint:** If lifetime is "scoped" or "transient" but the factory
 * is async (returns Promise), the adapter's lifetime type will be an error
 * message string instead of a valid Lifetime. This makes the adapter unusable
 * with GraphBuilder, producing a compile-time error.
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TLifetime - The lifetime scope
 * @typeParam TFactory - The factory function type
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TLifetime extends Lifetime,
  TFactory extends (
    deps: ResolvedDeps<never>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  readonly provides: TProvides;
  readonly lifetime: TLifetime;
  readonly factory: TFactory;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  requires?: undefined;
  clonable?: undefined;
}): Adapter<
  TProvides,
  never,
  EnforceAsyncLifetime<TFactory, TLifetime>,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  False,
  EmptyRequires
>;

/**
 * Creates an adapter with a factory function, explicit lifetime and dependencies.
 *
 * @overload
 * Factory with explicit lifetime and requires.
 * Defaults: `clonable: false`
 *
 * **Async Constraint:** If lifetime is "scoped" or "transient" but the factory
 * is async (returns Promise), the adapter's lifetime type will be an error
 * message string instead of a valid Lifetime. This makes the adapter unusable
 * with GraphBuilder, producing a compile-time error.
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TLifetime - The lifetime scope
 * @typeParam TFactory - The factory function type
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
  TFactory extends (
    deps: PortDeps<TRequires>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly lifetime: TLifetime;
  readonly factory: TFactory;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  clonable?: undefined;
}): Adapter<
  TProvides,
  TupleToUnion<TRequires>,
  EnforceAsyncLifetime<TFactory, TLifetime>,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  False,
  TRequires
>;

/**
 * Creates an adapter with a factory function and explicit clonable (no dependencies).
 *
 * @overload
 * Factory with explicit clonable flag, no dependencies.
 * Defaults: `requires: []`, `lifetime: "singleton"`
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TClonable - The clonable flag literal type
 * @typeParam TFactory - The factory function type
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TClonable extends boolean,
  TFactory extends (
    deps: ResolvedDeps<never>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  readonly provides: TProvides;
  readonly clonable: TClonable;
  readonly factory: TFactory;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  requires?: undefined;
  lifetime?: undefined;
}): Adapter<
  TProvides,
  never,
  Singleton,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  TClonable,
  EmptyRequires
>;

/**
 * Creates an adapter with a factory function, explicit clonable and dependencies.
 *
 * @overload
 * Factory with explicit clonable flag and requires.
 * Defaults: `lifetime: "singleton"`
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TClonable - The clonable flag literal type
 * @typeParam TFactory - The factory function type
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TClonable extends boolean,
  TFactory extends (
    deps: PortDeps<TRequires>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly clonable: TClonable;
  readonly factory: TFactory;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  lifetime?: undefined;
}): Adapter<
  TProvides,
  TupleToUnion<TRequires>,
  Singleton,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  TClonable,
  TRequires
>;

/**
 * Creates an adapter with a factory function, explicit lifetime and clonable (no dependencies).
 *
 * @overload
 * Factory with explicit lifetime and clonable, no dependencies.
 * Defaults: `requires: []`
 *
 * **Async Constraint:** If lifetime is "scoped" or "transient" but the factory
 * is async (returns Promise), the adapter's lifetime type will be an error
 * message string instead of a valid Lifetime. This makes the adapter unusable
 * with GraphBuilder, producing a compile-time error.
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TLifetime - The lifetime scope
 * @typeParam TClonable - The clonable flag literal type
 * @typeParam TFactory - The factory function type
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TLifetime extends Lifetime,
  const TClonable extends boolean,
  TFactory extends (
    deps: ResolvedDeps<never>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  readonly provides: TProvides;
  readonly lifetime: TLifetime;
  readonly clonable: TClonable;
  readonly factory: TFactory;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  requires?: undefined;
}): Adapter<
  TProvides,
  never,
  EnforceAsyncLifetime<TFactory, TLifetime>,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  TClonable,
  EmptyRequires
>;

/**
 * Creates an adapter with a factory function, all properties explicit.
 *
 * @overload
 * Factory with explicit requires, lifetime, and clonable - full control.
 *
 * **Async Constraint:** If lifetime is "scoped" or "transient" but the factory
 * is async (returns Promise), the adapter's lifetime type will be an error
 * message string instead of a valid Lifetime. This makes the adapter unusable
 * with GraphBuilder, producing a compile-time error.
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TLifetime - The lifetime scope
 * @typeParam TClonable - The clonable flag literal type
 * @typeParam TFactory - The factory function type
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
  const TClonable extends boolean,
  TFactory extends (
    deps: PortDeps<TRequires>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly lifetime: TLifetime;
  readonly clonable: TClonable;
  readonly factory: TFactory;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}): Adapter<
  TProvides,
  TupleToUnion<TRequires>,
  EnforceAsyncLifetime<TFactory, TLifetime>,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  TClonable,
  TRequires
>;

// =============================================================================
// createAdapter Overloads - Class Variant
// =============================================================================

/**
 * Creates an adapter from a class constructor with all defaults.
 *
 * - `requires` defaults to `[]`
 * - `lifetime` defaults to `"singleton"`
 * - `clonable` defaults to `false`
 * - Class instantiation is always synchronous (factoryKind: "sync")
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TClass - The class constructor type
 *
 * @example
 * ```typescript
 * const LoggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   class: ConsoleLogger
 * });
 * ```
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  TClass extends new () => InferService<TProvides>,
>(config: {
  readonly provides: TProvides;
  readonly class: TClass;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  requires?: undefined;
  lifetime?: undefined;
  clonable?: undefined;
}): Adapter<TProvides, never, Singleton, Sync, False, EmptyRequires>;

/**
 * Creates an adapter from a class constructor with explicit requires.
 *
 * - `lifetime` defaults to `"singleton"`
 * - `clonable` defaults to `false`
 * - Constructor parameters must match the order of ports in `requires` array
 * - Class instantiation is always synchronous (factoryKind: "sync")
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TClass - The class constructor type
 *
 * @example
 * ```typescript
 * const UserServiceAdapter = createAdapter({
 *   provides: UserServicePort,
 *   requires: [DatabasePort, LoggerPort],
 *   class: UserServiceImpl
 * });
 * ```
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  TClass extends new (...args: PortsToServices<TRequires>) => InferService<TProvides>,
>(config: {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly class: TClass;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  lifetime?: undefined;
  clonable?: undefined;
}): Adapter<TProvides, TupleToUnion<TRequires>, Singleton, Sync, False, TRequires>;

/**
 * Creates an adapter from a class constructor with explicit lifetime (no dependencies).
 *
 * - `requires` defaults to `[]`
 * - `clonable` defaults to `false`
 * - Class instantiation is always synchronous (factoryKind: "sync")
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TLifetime - The lifetime literal type
 * @typeParam TClass - The class constructor type
 *
 * @example
 * ```typescript
 * const ConfigAdapter = createAdapter({
 *   provides: ConfigPort,
 *   lifetime: "singleton",
 *   class: ConfigImpl
 * });
 * ```
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TLifetime extends Lifetime,
  TClass extends new () => InferService<TProvides>,
>(config: {
  readonly provides: TProvides;
  readonly class: TClass;
  readonly lifetime: TLifetime;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  requires?: undefined;
  clonable?: undefined;
}): Adapter<TProvides, never, TLifetime, Sync, False, EmptyRequires>;

/**
 * Creates an adapter from a class constructor with explicit lifetime and dependencies.
 *
 * - `clonable` defaults to `false`
 * - Constructor parameters must match the order of ports in `requires` array
 * - Class instantiation is always synchronous (factoryKind: "sync")
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TLifetime - The lifetime literal type
 * @typeParam TClass - The class constructor type
 *
 * @example
 * ```typescript
 * const UserServiceAdapter = createAdapter({
 *   provides: UserServicePort,
 *   requires: [DatabasePort],
 *   lifetime: "scoped",
 *   class: UserServiceImpl
 * });
 * ```
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
  TClass extends new (...args: PortsToServices<TRequires>) => InferService<TProvides>,
>(config: {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly class: TClass;
  readonly lifetime: TLifetime;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  clonable?: undefined;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, False, TRequires>;

/**
 * Creates an adapter from a class constructor with explicit clonable flag (no dependencies).
 *
 * - `requires` defaults to `[]`
 * - `lifetime` defaults to `"singleton"`
 * - Class instantiation is always synchronous (factoryKind: "sync")
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TClonable - The clonable literal type (true or false)
 * @typeParam TClass - The class constructor type
 *
 * @example
 * ```typescript
 * const ConfigAdapter = createAdapter({
 *   provides: ConfigPort,
 *   class: ConfigImpl,
 *   clonable: true
 * });
 * ```
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TClonable extends boolean,
  TClass extends new () => InferService<TProvides>,
>(config: {
  readonly provides: TProvides;
  readonly class: TClass;
  readonly clonable: TClonable;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  requires?: undefined;
  lifetime?: undefined;
}): Adapter<TProvides, never, Singleton, Sync, TClonable, EmptyRequires>;

/**
 * Creates an adapter from a class constructor with explicit clonable flag and dependencies.
 *
 * - `lifetime` defaults to `"singleton"`
 * - Constructor parameters must match the order of ports in `requires` array
 * - Class instantiation is always synchronous (factoryKind: "sync")
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TClonable - The clonable literal type (true or false)
 * @typeParam TClass - The class constructor type
 *
 * @example
 * ```typescript
 * const UserAdapter = createAdapter({
 *   provides: UserPort,
 *   requires: [DatabasePort],
 *   class: UserImpl,
 *   clonable: true
 * });
 * ```
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TClonable extends boolean,
  TClass extends new (...args: PortsToServices<TRequires>) => InferService<TProvides>,
>(config: {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly class: TClass;
  readonly clonable: TClonable;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  lifetime?: undefined;
}): Adapter<TProvides, TupleToUnion<TRequires>, Singleton, Sync, TClonable, TRequires>;

/**
 * Creates an adapter from a class constructor with explicit lifetime and clonable (no dependencies).
 *
 * - `requires` defaults to `[]`
 * - Class instantiation is always synchronous (factoryKind: "sync")
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TLifetime - The lifetime literal type
 * @typeParam TClonable - The clonable literal type (true or false)
 * @typeParam TClass - The class constructor type
 *
 * @example
 * ```typescript
 * const ConfigAdapter = createAdapter({
 *   provides: ConfigPort,
 *   lifetime: "singleton",
 *   clonable: true,
 *   class: ConfigImpl
 * });
 * ```
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TLifetime extends Lifetime,
  const TClonable extends boolean,
  TClass extends new () => InferService<TProvides>,
>(config: {
  readonly provides: TProvides;
  readonly class: TClass;
  readonly lifetime: TLifetime;
  readonly clonable: TClonable;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  requires?: undefined;
}): Adapter<TProvides, never, TLifetime, Sync, TClonable, EmptyRequires>;

/**
 * Creates an adapter from a class constructor with all parameters explicit.
 *
 * - Constructor parameters must match the order of ports in `requires` array
 * - Class instantiation is always synchronous (factoryKind: "sync")
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TLifetime - The lifetime literal type
 * @typeParam TClonable - The clonable literal type (true or false)
 * @typeParam TClass - The class constructor type
 *
 * @example
 * ```typescript
 * const UserServiceAdapter = createAdapter({
 *   provides: UserServicePort,
 *   requires: [DatabasePort, LoggerPort],
 *   lifetime: "scoped",
 *   clonable: false,
 *   class: UserServiceImpl
 * });
 * ```
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
  const TClonable extends boolean,
  TClass extends new (...args: PortsToServices<TRequires>) => InferService<TProvides>,
>(config: {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly class: TClass;
  readonly lifetime: TLifetime;
  readonly clonable: TClonable;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, TClonable, TRequires>;

/**
 * Implementation signature that handles all factory-based configurations.
 * This must immediately follow the overloads.
 */
export function createAdapter(config: {
  provides: Port<unknown, string>;
  factory?: (deps: Record<string, unknown>) => unknown | Promise<unknown>;
  class?: new (...args: unknown[]) => unknown;
  requires?: readonly Port<unknown, string>[];
  lifetime?: Lifetime;
  clonable?: boolean;
  finalizer?: (instance: unknown) => void | Promise<void>;
}): Adapter<
  Port<unknown, string>,
  unknown,
  Lifetime,
  typeof SYNC | typeof ASYNC,
  boolean,
  readonly Port<unknown, string>[]
> {
  // Validate mutual exclusion: exactly one of factory or class must be provided
  const hasFactory = config.factory !== undefined;
  const hasClass = config.class !== undefined;

  if (hasFactory && hasClass) {
    throw new TypeError(
      "ERROR[HEX020]: Invalid adapter config: Cannot provide both 'factory' and 'class'. " +
        "Use 'factory' for custom instantiation logic, or 'class' for constructor injection."
    );
  }

  if (!hasFactory && !hasClass) {
    throw new TypeError(
      "ERROR[HEX019]: Invalid adapter config: Must provide either 'factory' or 'class'. " +
        "Provide a factory function that creates the instance, or a class constructor for dependency injection."
    );
  }

  // Apply defaults
  const requires = config.requires ?? EMPTY_REQUIRES;
  const lifetime = config.lifetime ?? SINGLETON;
  const clonable = config.clonable ?? FALSE;

  // Determine factory function and factoryKind
  let factory: (deps: Record<string, unknown>) => unknown | Promise<unknown>;
  let factoryKind: typeof SYNC | typeof ASYNC;

  if (config.class !== undefined) {
    // Class instantiation is always sync
    factoryKind = SYNC;
    // Class variant: create factory that instantiates class with constructor injection
    const ClassConstructor = config.class;
    factory = (deps: Record<string, unknown>): unknown => {
      const args = extractServicesInOrder(deps, requires);
      return new ClassConstructor(...args);
    };
  } else if (config.factory !== undefined) {
    // Factory variant: use provided factory
    factory = config.factory;
    // Detect async factories at runtime by checking constructor name
    // Note: This detects `async () => {}` but not `() => Promise.resolve()`
    // For the latter, users should use provideAsync() on GraphBuilder
    factoryKind = config.factory.constructor.name === "AsyncFunction" ? ASYNC : SYNC;
  } else {
    // This should never happen due to validation above, but TypeScript needs exhaustiveness
    throw new TypeError("Unreachable: either factory or class must be defined");
  }

  // Determine if this is an async adapter (for validation and lifetime enforcement)
  const isAsync = factoryKind === ASYNC;

  // Enforce singleton lifetime for async factories
  const effectiveLifetime = isAsync ? SINGLETON : lifetime;

  // Call validation
  assertValidAdapterConfig(
    {
      provides: config.provides,
      requires,
      lifetime: effectiveLifetime,
      factory,
      finalizer: config.finalizer,
    },
    isAsync
  );

  // Build the adapter object
  const baseAdapter = {
    provides: config.provides,
    requires,
    lifetime: effectiveLifetime,
    factoryKind,
    factory,
    clonable,
  };

  // Add finalizer if present
  if (config.finalizer !== undefined) {
    return Object.freeze({
      ...baseAdapter,
      finalizer: config.finalizer,
    });
  }

  return Object.freeze(baseAdapter);
}
