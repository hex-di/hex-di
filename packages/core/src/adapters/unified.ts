/**
 * Unified createAdapter API.
 *
 * This module contains the unified `createAdapter()` function that accepts
 * both factory functions and class constructors through a single API.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "../ports/types.js";
import type { Adapter, Lifetime, ResolvedDeps } from "./types.js";
import type { TupleToUnion } from "../utils/type-utilities.js";
import type { ClassConfig } from "./unified-types.js";
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

/**
 * Detects if a factory function returns a Promise (async factory).
 *
 * @typeParam TFactory - The factory function type to check
 * @returns `true` if factory returns Promise, `false` otherwise
 *
 * @internal
 */
type IsAsyncFactory<TFactory> = TFactory extends (...args: never[]) => Promise<unknown>
  ? true
  : false;

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
    deps: ResolvedDeps<TupleToUnion<TRequires>>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly factory: TFactory;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}): Adapter<
  TProvides,
  TupleToUnion<TRequires>,
  Singleton,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  False,
  TRequires
>;

/**
 * Creates an adapter with a factory function and explicit lifetime.
 *
 * @overload
 * Factory with explicit lifetime (no clonable).
 * Defaults: `requires: []`, `clonable: false`
 *
 * Note: If factory is async (returns Promise), lifetime is forced to "singleton"
 * regardless of the input value.
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies (optional, defaults to [])
 * @typeParam TLifetime - The lifetime scope
 * @typeParam TFactory - The factory function type
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
  TFactory extends (
    deps: ResolvedDeps<TupleToUnion<TRequires>>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  readonly provides: TProvides;
  readonly requires?: TRequires;
  readonly lifetime: TLifetime;
  readonly factory: TFactory;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}): Adapter<
  TProvides,
  TupleToUnion<TRequires>,
  IsAsyncFactory<TFactory> extends true ? Singleton : TLifetime,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  False,
  TRequires extends readonly Port<unknown, string>[] ? TRequires : EmptyRequires
>;

/**
 * Creates an adapter with a factory function and explicit clonable.
 *
 * @overload
 * Factory with explicit clonable flag.
 * Defaults: `requires: []`, `lifetime: "singleton"`
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies (optional, defaults to [])
 * @typeParam TClonable - The clonable flag literal type
 * @typeParam TFactory - The factory function type
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TClonable extends boolean,
  TFactory extends (
    deps: ResolvedDeps<TupleToUnion<TRequires>>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  readonly provides: TProvides;
  readonly requires?: TRequires;
  readonly clonable: TClonable;
  readonly factory: TFactory;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}): Adapter<
  TProvides,
  TupleToUnion<TRequires>,
  Singleton,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  TClonable,
  TRequires extends readonly Port<unknown, string>[] ? TRequires : EmptyRequires
>;

/**
 * Creates an adapter with a factory function, all properties explicit.
 *
 * @overload
 * Factory with explicit requires, lifetime, and clonable - full control.
 *
 * Note: If factory is async (returns Promise), lifetime is forced to "singleton"
 * regardless of the input value.
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
    deps: ResolvedDeps<TupleToUnion<TRequires>>
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
  IsAsyncFactory<TFactory> extends true ? Singleton : TLifetime,
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
 * Creates an adapter from a class constructor with explicit lifetime.
 *
 * - `requires` defaults to `[]`
 * - `clonable` defaults to `false`
 * - Class instantiation is always synchronous (factoryKind: "sync")
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies (may be empty)
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
  readonly requires?: TRequires;
  readonly class: TClass;
  readonly lifetime: TLifetime;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  clonable?: undefined;
}): Adapter<
  TProvides,
  TupleToUnion<TRequires>,
  TLifetime,
  Sync,
  False,
  TRequires extends readonly [] ? EmptyRequires : TRequires
>;

/**
 * Creates an adapter from a class constructor with explicit clonable flag.
 *
 * - `requires` defaults to `[]`
 * - `lifetime` defaults to `"singleton"`
 * - Class instantiation is always synchronous (factoryKind: "sync")
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies (may be empty)
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
  const TRequires extends readonly Port<unknown, string>[],
  const TClonable extends boolean,
  TClass extends new (...args: PortsToServices<TRequires>) => InferService<TProvides>,
>(config: {
  readonly provides: TProvides;
  readonly requires?: TRequires;
  readonly class: TClass;
  readonly clonable: TClonable;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
  lifetime?: undefined;
}): Adapter<
  TProvides,
  TupleToUnion<TRequires>,
  Singleton,
  Sync,
  TClonable,
  TRequires extends readonly [] ? EmptyRequires : TRequires
>;

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
  // Class variant not yet implemented (will be added in Plan 09-03)
  if (config.class !== undefined) {
    throw new Error(
      "Class-based createAdapter not yet implemented. This will be available in Plan 09-03."
    );
  }

  // Factory is required for now
  if (config.factory === undefined) {
    throw new TypeError(
      "ERROR[HEX019]: Invalid adapter config: 'factory' is required. " +
        "Provide a factory function that creates the service instance."
    );
  }

  // Apply defaults
  const requires = config.requires ?? EMPTY_REQUIRES;
  const lifetime = config.lifetime ?? SINGLETON;
  const clonable = config.clonable ?? FALSE;
  const factoryKind = SYNC; // For v1, always use SYNC at runtime (type system handles async detection)

  // Call validation
  assertValidAdapterConfig(
    {
      provides: config.provides,
      requires,
      lifetime,
      factory: config.factory,
    },
    false
  );

  // Build the adapter object
  const baseAdapter = {
    provides: config.provides,
    requires,
    lifetime,
    factoryKind,
    factory: config.factory,
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
