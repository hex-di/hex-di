/**
 * Adapter factory functions.
 *
 * This module provides `createAdapter()` and `createAsyncAdapter()` functions
 * for creating typed adapters with dependency metadata. Adapters are the bridge
 * between ports (interfaces) and their concrete implementations.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "../ports/types.js";
import type { TupleToUnion } from "../utils/type-utilities.js";
import type { Adapter, Lifetime, ResolvedDeps } from "./types.js";
import { SYNC, ASYNC, SINGLETON, FALSE } from "./constants.js";
import type { Sync, Async, Singleton, False } from "./constants.js";

// =============================================================================
// Runtime Validation Guard
// =============================================================================

/**
 * Valid lifetime values for runtime validation.
 * @internal
 */
const VALID_LIFETIMES = new Set(["singleton", "scoped", "transient"]);

// =============================================================================
// Type Guards for Port Validation
// =============================================================================

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
          'Valid values: "singleton", "scoped", "transient".'
      );
    }

    if (!VALID_LIFETIMES.has(config.lifetime)) {
      throw new TypeError(
        `ERROR[HEX015]: Invalid adapter config: 'lifetime' must be "singleton", "scoped", or "transient". ` +
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

  // Validate finalizer if present
  if (
    "finalizer" in config &&
    config.finalizer !== undefined &&
    typeof config.finalizer !== "function"
  ) {
    throw new TypeError(
      `ERROR[HEX018]: Invalid adapter config: 'finalizer' must be a function, got ${typeof config.finalizer}.`
    );
  }
}

// =============================================================================
// createAdapter - Overloads for Type-Safe Defaults
// =============================================================================

/**
 * Configuration object for creating an adapter (INPUT to `createAdapter()`).
 */
interface AdapterConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TLifetime extends Lifetime,
  TClonable extends boolean,
> {
  provides: TProvides;
  requires: TRequires;
  lifetime: TLifetime;
  factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => InferService<TProvides>;
  /**
   * Whether this adapter's service can be safely shallow-cloned for forked inheritance.
   * @default false
   */
  clonable?: TClonable;
  finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}

/**
 * Creates a typed adapter with dependency metadata for registration in a dependency graph.
 *
 * @overload When `clonable` is NOT provided (undefined), defaults to `false` literal type.
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
>(
  config: Omit<AdapterConfig<TProvides, TRequires, TLifetime, false>, "clonable"> & {
    clonable?: undefined;
  }
): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, False, TRequires>;

/**
 * Creates a typed adapter with dependency metadata for registration in a dependency graph.
 *
 * @overload When `clonable` IS provided with a literal boolean, uses that literal type.
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
  const TClonable extends boolean,
>(
  config: AdapterConfig<TProvides, TRequires, TLifetime, TClonable> & {
    clonable: TClonable;
  }
): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, TClonable, TRequires>;

/**
 * Creates a typed adapter with dependency metadata for registration in a dependency graph.
 *
 * @overload Fallback for dynamic `boolean | undefined` values - returns `boolean` type.
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
>(
  config: Omit<AdapterConfig<TProvides, TRequires, TLifetime, boolean>, "clonable"> & {
    clonable?: boolean | undefined;
  }
): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, boolean, TRequires>;

/**
 * Implementation that handles all overload cases.
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
>(
  config: AdapterConfig<TProvides, TRequires, TLifetime, boolean>
): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, boolean, TRequires> {
  assertValidAdapterConfig(config, false);

  const factoryKind = SYNC;
  const clonable = config.clonable === undefined ? FALSE : config.clonable;

  const baseAdapter = {
    provides: config.provides,
    requires: config.requires,
    lifetime: config.lifetime,
    factoryKind,
    factory: config.factory,
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

// =============================================================================
// createAsyncAdapter - Overloads for Type-Safe Defaults
// =============================================================================

/**
 * Configuration object for creating an async adapter (INPUT to `createAsyncAdapter()`).
 */
interface AsyncAdapterConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TClonable extends boolean = false,
> {
  provides: TProvides;
  requires: TRequires;
  factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => Promise<InferService<TProvides>>;
  /**
   * Whether this adapter's service can be safely shallow-cloned for forked inheritance.
   * @default false
   */
  clonable?: TClonable;
  finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}

/**
 * Creates a typed async adapter with dependency metadata for registration in a dependency graph.
 *
 * Async adapters are always singletons (this is enforced by the type system).
 *
 * @overload When `clonable` is NOT provided (undefined), defaults to `false` literal type.
 */
export function createAsyncAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
>(
  config: Omit<AsyncAdapterConfig<TProvides, TRequires, false>, "clonable"> & {
    clonable?: undefined;
  }
): Adapter<TProvides, TupleToUnion<TRequires>, Singleton, Async, False, TRequires>;

/**
 * Creates a typed async adapter with dependency metadata for registration in a dependency graph.
 *
 * @overload When `clonable` IS provided with a literal boolean, uses that literal type.
 */
export function createAsyncAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TClonable extends boolean,
>(
  config: AsyncAdapterConfig<TProvides, TRequires, TClonable> & {
    clonable: TClonable;
  }
): Adapter<TProvides, TupleToUnion<TRequires>, Singleton, Async, TClonable, TRequires>;

/**
 * Creates a typed async adapter with dependency metadata for registration in a dependency graph.
 *
 * @overload Fallback for dynamic `boolean | undefined` values - returns `boolean` type.
 */
export function createAsyncAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
>(
  config: Omit<AsyncAdapterConfig<TProvides, TRequires, boolean>, "clonable"> & {
    clonable?: boolean | undefined;
  }
): Adapter<TProvides, TupleToUnion<TRequires>, Singleton, Async, boolean, TRequires>;

/**
 * Implementation that handles all overload cases.
 */
export function createAsyncAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
>(
  config: AsyncAdapterConfig<TProvides, TRequires, boolean>
): Adapter<TProvides, TupleToUnion<TRequires>, Singleton, Async, boolean, TRequires> {
  assertValidAdapterConfig(config, true);

  const factoryKind = ASYNC;
  const lifetime = SINGLETON;
  const clonable = config.clonable === undefined ? FALSE : config.clonable;

  const baseAdapter = {
    provides: config.provides,
    requires: config.requires,
    lifetime,
    factoryKind,
    factory: config.factory,
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
