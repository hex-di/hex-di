/**
 * Unified createAdapter API.
 *
 * This module contains the unified `createAdapter()` function that accepts
 * both factory functions and class constructors through a single API.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "../ports/types.js";
import type { Adapter, Lifetime, FactoryKind, ResolvedDeps, PortDeps } from "./types.js";
import type { TupleToUnion } from "../utils/type-utilities.js";
import type { IsAsyncFactory, EnforceAsyncLifetime, FactoryResult, InferFactoryError } from "./unified-types.js";
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
  IsAsyncFactory,
  BaseUnifiedConfig,
  FactoryConfig,
  FactoryResult,
  ClassConfig,
  InferFactoryError,
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
 * Duck-typed Ok variant of a Result-like return value.
 * @internal
 */
interface ResultLikeOk {
  readonly _tag: "Ok";
  readonly value: unknown;
}

/**
 * Duck-typed Err variant of a Result-like return value.
 * @internal
 */
interface ResultLikeErr {
  readonly _tag: "Err";
  readonly error: unknown;
}

/**
 * Union of duck-typed Result-like variants.
 * @internal
 */
type ResultLike = ResultLikeOk | ResultLikeErr;

/**
 * Type guard to check if a value is a Result-like object (has `_tag: "Ok" | "Err"`).
 *
 * Uses duck-typing so `@hex-di/core` has no dependency on `@hex-di/result`.
 * When detected, `createAdapter` unwraps the Result: extracting `.value` on Ok,
 * throwing `.error` on Err.
 *
 * @internal
 */
function isResultLike(value: unknown): value is ResultLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("_tag" in value)) {
    return false;
  }
  return value._tag === "Ok" || value._tag === "Err";
}

/**
 * Type guard to check if a value is a PromiseLike (thenable) object.
 *
 * Used to detect `ResultAsync` and other thenable returns from factories
 * that aren't declared `async` but return PromiseLike values.
 *
 * @internal
 */
function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as Record<string, unknown>)["then"] === "function"
  );
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
  ) => InferService<TProvides> | Promise<InferService<TProvides>> | FactoryResult<InferService<TProvides>> | PromiseLike<FactoryResult<InferService<TProvides>>>,
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
  EmptyRequires,
  InferFactoryError<ReturnType<TFactory>>
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
  ) => InferService<TProvides> | Promise<InferService<TProvides>> | FactoryResult<InferService<TProvides>> | PromiseLike<FactoryResult<InferService<TProvides>>>,
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
  TRequires,
  InferFactoryError<ReturnType<TFactory>>
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
  ) => InferService<TProvides> | Promise<InferService<TProvides>> | FactoryResult<InferService<TProvides>> | PromiseLike<FactoryResult<InferService<TProvides>>>,
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
  EmptyRequires,
  InferFactoryError<ReturnType<TFactory>>
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
  ) => InferService<TProvides> | Promise<InferService<TProvides>> | FactoryResult<InferService<TProvides>> | PromiseLike<FactoryResult<InferService<TProvides>>>,
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
  TRequires,
  InferFactoryError<ReturnType<TFactory>>
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
  ) => InferService<TProvides> | Promise<InferService<TProvides>> | FactoryResult<InferService<TProvides>> | PromiseLike<FactoryResult<InferService<TProvides>>>,
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
  EmptyRequires,
  InferFactoryError<ReturnType<TFactory>>
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
  ) => InferService<TProvides> | Promise<InferService<TProvides>> | FactoryResult<InferService<TProvides>> | PromiseLike<FactoryResult<InferService<TProvides>>>,
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
  TRequires,
  InferFactoryError<ReturnType<TFactory>>
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
  ) => InferService<TProvides> | Promise<InferService<TProvides>> | FactoryResult<InferService<TProvides>> | PromiseLike<FactoryResult<InferService<TProvides>>>,
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
  EmptyRequires,
  InferFactoryError<ReturnType<TFactory>>
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
  ) => InferService<TProvides> | Promise<InferService<TProvides>> | FactoryResult<InferService<TProvides>> | PromiseLike<FactoryResult<InferService<TProvides>>>,
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
  TRequires,
  InferFactoryError<ReturnType<TFactory>>
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
  readonly Port<unknown, string>[],
  unknown
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
    // Factory variant: detect async, pass through factory as-is.
    // Result returns are NOT auto-unwrapped here. Factories that return Result
    // will have TError != never on the Adapter type. Users must handle errors
    // via adapterOrDie() or adapterOrElse() before providing to a graph.
    // The runtime engine has defense-in-depth unwrapping for safety.
    const isAsyncFactory = config.factory.constructor.name === "AsyncFunction";
    factoryKind = isAsyncFactory ? ASYNC : SYNC;
    factory = config.factory;
  } else {
    // This should never happen due to validation above, but TypeScript needs exhaustiveness
    throw new TypeError("Unreachable: either factory or class must be defined");
  }

  // Determine if this is an async adapter (for validation and lifetime enforcement)
  const isAsync = factoryKind === ASYNC;

  // Enforce singleton lifetime for async factories
  const effectiveLifetime = isAsync ? SINGLETON : lifetime;

  // Call validation (use original config.factory for type check, fallback to wrapped for class variant)
  assertValidAdapterConfig(
    {
      provides: config.provides,
      requires,
      lifetime: effectiveLifetime,
      factory: config.factory ?? factory,
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

// =============================================================================
// Error Channel Handlers
// =============================================================================

/**
 * Unwraps a Result-like value if it is Ok, otherwise returns the value as-is.
 * Does NOT handle Err — only use when value is known to be Ok or non-Result.
 * @internal
 */
function unwrapIfResult(value: unknown): unknown {
  if (isResultLike(value) && value._tag === "Ok") {
    return value.value;
  }
  return value;
}

/**
 * Unwraps a Result-like value, throwing on Err.
 * @internal
 */
function unwrapResultOrDie(raw: unknown): unknown {
  if (isResultLike(raw)) {
    if (raw._tag === "Err") throw raw.error;
    return raw.value;
  }
  return raw;
}

/**
 * Runtime adapter shape used internally by error channel handlers.
 * Uses a wider factory type than AdapterConstraint to enable calling.
 * @internal
 */
interface RuntimeAdapter {
  readonly provides: Port<unknown, string>;
  readonly requires: readonly Port<unknown, string>[];
  readonly lifetime: Lifetime;
  readonly factoryKind: FactoryKind;
  readonly factory: (deps: Record<string, unknown>) => unknown | Promise<unknown>;
  readonly clonable: boolean;
  finalizer?(instance: never): void | Promise<void>;
}

/**
 * Clones an adapter with a new factory function, preserving all other properties.
 * @internal
 */
function cloneAdapterWithFactory(
  adapter: RuntimeAdapter,
  factory: (deps: Record<string, unknown>) => unknown | Promise<unknown>,
): RuntimeAdapter {
  const result = {
    provides: adapter.provides,
    requires: adapter.requires,
    lifetime: adapter.lifetime,
    factoryKind: adapter.factoryKind,
    factory,
    clonable: adapter.clonable,
  };

  if (adapter.finalizer !== undefined) {
    return Object.freeze({ ...result, finalizer: adapter.finalizer });
  }

  return Object.freeze(result);
}

/**
 * Wraps a fallible adapter so that `Err` results are thrown as exceptions.
 *
 * Takes an adapter whose factory returns `Result<T, E>` (TError != never)
 * and returns a new adapter with `TError = never`. The wrapped factory
 * extracts `.value` on `Ok` and throws `.error` on `Err`.
 *
 * @example
 * ```typescript
 * const FallibleAdapter = createAdapter({
 *   provides: DbPort,
 *   factory: () => connectToDb(), // returns Result<Db, DbError>
 * });
 *
 * // FallibleAdapter has TError = DbError
 * // adapterOrDie wraps it so TError = never (throws on Err)
 * graph.provide(adapterOrDie(FallibleAdapter));
 * ```
 */
export function adapterOrDie<
  TProvides,
  TRequires,
  TLifetime extends string,
  TFactoryKind extends FactoryKind,
  TClonable extends boolean,
  TRequiresTuple extends readonly unknown[],
  TError,
>(
  adapter: Adapter<TProvides, TRequires, TLifetime, TFactoryKind, TClonable, TRequiresTuple, TError>
): Adapter<TProvides, TRequires, TLifetime, TFactoryKind, TClonable, TRequiresTuple, never>;
export function adapterOrDie(adapter: RuntimeAdapter): RuntimeAdapter {
  const userFactory = adapter.factory;
  const wrappedFactory = adapter.factoryKind === ASYNC
    ? async (deps: Record<string, unknown>): Promise<unknown> => {
        const raw = await userFactory(deps);
        return unwrapResultOrDie(raw);
      }
    : (deps: Record<string, unknown>): unknown => {
        const raw = userFactory(deps);
        return unwrapResultOrDie(raw);
      };

  return cloneAdapterWithFactory(adapter, wrappedFactory);
}

/**
 * Wraps a fallible adapter with an infallible fallback adapter.
 *
 * Takes a primary adapter whose factory returns `Result<T, E>` (TError != never)
 * and a fallback adapter that provides the same port with `TError = never`.
 * Returns a new adapter with `TError = never` that tries the primary factory
 * first, and on `Err` invokes the fallback factory.
 *
 * Both adapters must provide the same port. The fallback adapter must be
 * infallible (TError = never). Requirements from both adapters are merged.
 *
 * @example
 * ```typescript
 * const RedisAdapter = createAdapter({
 *   provides: CachePort,
 *   factory: (): Result<Cache, RedisError> => connectToRedis(),
 * });
 *
 * const InMemoryCacheAdapter = createAdapter({
 *   provides: CachePort,
 *   factory: () => new InMemoryCache(),
 * });
 *
 * // On error, fall back to in-memory cache
 * graph.provide(adapterOrElse(RedisAdapter, InMemoryCacheAdapter));
 * ```
 */
export function adapterOrElse<
  TProvides,
  TRequires1,
  TLifetime1 extends string,
  TFactoryKind1 extends FactoryKind,
  TClonable1 extends boolean,
  TRequiresTuple1 extends readonly unknown[],
  TError,
  TRequires2,
  TLifetime2 extends string,
  TFactoryKind2 extends FactoryKind,
  TClonable2 extends boolean,
  TRequiresTuple2 extends readonly unknown[],
>(
  adapter: Adapter<TProvides, TRequires1, TLifetime1, TFactoryKind1, TClonable1, TRequiresTuple1, TError>,
  fallback: Adapter<TProvides, TRequires2, TLifetime2, TFactoryKind2, TClonable2, TRequiresTuple2, never>,
): Adapter<
  TProvides,
  TRequires1 | TRequires2,
  TLifetime1,
  TFactoryKind1 extends "async" ? "async" : TFactoryKind2 extends "async" ? "async" : TFactoryKind1,
  TClonable1,
  readonly [...TRequiresTuple1, ...TRequiresTuple2],
  never
>;
export function adapterOrElse(
  adapter: RuntimeAdapter,
  fallback: RuntimeAdapter,
): RuntimeAdapter {
  const primaryFactory = adapter.factory;
  const fallbackFactory = fallback.factory;
  const isAsync = adapter.factoryKind === ASYNC || fallback.factoryKind === ASYNC;

  const wrappedFactory = isAsync
    ? async (deps: Record<string, unknown>): Promise<unknown> => {
        const raw = primaryFactory(deps);
        const resolved = isThenable(raw) ? await raw : raw;
        if (isResultLike(resolved) && resolved._tag === "Err") {
          const fb = fallbackFactory(deps);
          const fbResolved = isThenable(fb) ? await fb : fb;
          return unwrapIfResult(fbResolved);
        }
        return unwrapIfResult(resolved);
      }
    : (deps: Record<string, unknown>): unknown => {
        const raw = primaryFactory(deps);
        if (isResultLike(raw) && raw._tag === "Err") {
          return unwrapIfResult(fallbackFactory(deps));
        }
        return unwrapIfResult(raw);
      };

  // Merge requires arrays (dedup by port name)
  const seenNames = new Set<string>();
  const mergedRequires: Port<unknown, string>[] = [];
  for (const p of [...adapter.requires, ...fallback.requires]) {
    const name = p.__portName;
    if (!seenNames.has(name)) {
      seenNames.add(name);
      mergedRequires.push(p);
    }
  }

  const result = {
    provides: adapter.provides,
    requires: mergedRequires,
    lifetime: adapter.lifetime,
    factoryKind: isAsync ? ASYNC : adapter.factoryKind,
    factory: wrappedFactory,
    clonable: adapter.clonable,
  };

  if (adapter.finalizer !== undefined) {
    return Object.freeze({ ...result, finalizer: adapter.finalizer });
  }

  return Object.freeze(result);
}
