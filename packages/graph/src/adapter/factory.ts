import type { Port, InferService } from "@hex-di/ports";
import type { TupleToUnion } from "../common/index.js";
import type { Adapter, Lifetime, ResolvedDeps } from "./types.js";

// =============================================================================
// Literal Value Constants
// =============================================================================
//
// These frozen objects provide literal-typed values without using `as const`.
// By using `Object.freeze()` on an object and extracting its property, we get
// a value whose type is the literal type. This is because:
//
// 1. TypeScript infers literal types for readonly properties of frozen objects
// 2. The property access returns the exact literal type
//
// This pattern avoids `as const` casts while achieving the same type narrowing.
//

/**
 * Helper function that returns a value with its literal type preserved.
 * TypeScript infers the const type parameter from the argument.
 * @internal
 */
function literal<const T>(value: T): T {
  return value;
}

/**
 * Literal-typed constant values for factory kinds and defaults.
 * Using the `literal()` helper preserves exact types without `as const`.
 * @internal
 */
const SYNC = literal("sync");
const ASYNC = literal("async");
const SINGLETON = literal("singleton");
const FALSE = literal(false);

// Type-level extraction of literal types
type Sync = typeof SYNC;
type Async = typeof ASYNC;
type Singleton = typeof SINGLETON;
type False = typeof FALSE;

// =============================================================================
// createAdapter - Overloads for Type-Safe Defaults
// =============================================================================

/**
 * Configuration object for creating an adapter.
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
 * This overload catches cases where `clonable` is passed as a variable with type `boolean | undefined`.
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
  // Use the literal constant for factoryKind to preserve "sync" literal type
  const factoryKind = SYNC;

  // Determine clonable: use provided value or default to false literal
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
 * Valid range for async adapter initialization priority.
 * Priority determines the order in which async adapters are initialized:
 * - Lower values = initialized first
 * - Higher values = initialized later
 * - Default is 100
 */
const MIN_INIT_PRIORITY = 0;
const MAX_INIT_PRIORITY = 1000;

/**
 * Configuration object for creating an async adapter.
 */
interface AsyncAdapterConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TClonable extends boolean,
> {
  provides: TProvides;
  requires: TRequires;
  factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => Promise<InferService<TProvides>>;
  /**
   * Initialization priority for async adapters.
   * Lower values are initialized first. Valid range: 0-1000.
   * @default 100
   */
  initPriority?: number;
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
 * @overload When `clonable` is NOT provided (undefined), defaults to `false` literal type.
 * @throws {RangeError} If initPriority is outside the valid range (0-1000)
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
 * @throws {RangeError} If initPriority is outside the valid range (0-1000)
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
 * This overload catches cases where `clonable` is passed as a variable with type `boolean | undefined`.
 * @throws {RangeError} If initPriority is outside the valid range (0-1000)
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
  // Validate initPriority if provided
  const priority = config.initPriority ?? 100;
  if (priority < MIN_INIT_PRIORITY || priority > MAX_INIT_PRIORITY) {
    throw new RangeError(
      `initPriority must be between ${MIN_INIT_PRIORITY} and ${MAX_INIT_PRIORITY}, got ${priority}`
    );
  }

  // Use literal constants for factoryKind and lifetime to preserve literal types
  const factoryKind = ASYNC;
  const lifetime = SINGLETON;

  // Determine clonable: use provided value or default to false literal
  const clonable = config.clonable === undefined ? FALSE : config.clonable;

  const baseAdapter = {
    provides: config.provides,
    requires: config.requires,
    lifetime,
    factoryKind,
    factory: config.factory,
    initPriority: priority,
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
