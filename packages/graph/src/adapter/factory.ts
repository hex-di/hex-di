/**
 * Adapter factory functions.
 *
 * This module provides `createAdapter()` and `createAsyncAdapter()` functions
 * for creating typed adapters with dependency metadata. Adapters are the bridge
 * between ports (interfaces) and their concrete implementations.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { TupleToUnion } from "../types/type-utilities.js";
import type { Adapter, Lifetime, ResolvedDeps } from "./types/adapter-types.js";
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
 * @pure Returns boolean deterministically based on input structure.
 *
 * Uses the `in` operator for TypeScript narrowing, then validates
 * the property type. After the `in` check, TypeScript allows accessing
 * the property directly for type checking.
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
  // After the 'in' check, TypeScript knows value has __portName property
  return typeof value.__portName === "string";
}

/**
 * Validates adapter configuration at runtime.
 *
 * @pure Throws deterministically for invalid inputs; no side effects otherwise.
 *
 * This function provides detailed error messages for common misconfigurations,
 * helping developers identify issues quickly. While TypeScript catches most
 * errors at compile time, runtime validation catches:
 * - Dynamic configurations
 * - JavaScript consumers (no TypeScript)
 * - Incorrect port objects from misconfigured build tools
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
        "Create ports using createPort() from @hex-di/ports."
    );
  }

  // After isPortLike check, TypeScript knows config.provides is PortLike
  const providesPort = config.provides;

  // Validate 'requires' - must be an array of Port objects
  if (!Array.isArray(config.requires)) {
    throw new TypeError(
      "ERROR[HEX012]: Invalid adapter config: 'requires' must be an array. " +
        `Got: ${typeof config.requires}. ` +
        "Use [] for no dependencies or [PortA, PortB] for dependencies."
    );
  }

  // Validate and collect requires into a properly typed array
  const requires: PortLike[] = [];
  for (let i = 0; i < config.requires.length; i++) {
    const req: unknown = config.requires[i];
    // Use type guard for validation
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
  // Note: 'requires' and 'providesPort' are already typed via type guards above
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

  // At this point, all validation has passed
  // The 'requires' and 'providesPort' variables from above are properly typed
}

// =============================================================================
// createAdapter - Overloads for Type-Safe Defaults
// =============================================================================

/**
 * ## Overload Strategy for `clonable` Type Preservation
 *
 * Three overloads preserve literal types for the `clonable` property:
 *
 * | Call Pattern                    | Matched Overload | Result Type      |
 * |---------------------------------|------------------|------------------|
 * | `{ clonable: undefined }` or omitted | Overload 1   | `clonable: false` |
 * | `{ clonable: true }` or `false`      | Overload 2   | literal preserved |
 * | `{ clonable: someVar }` (dynamic)    | Overload 3   | `clonable: boolean` |
 *
 * Without overloads, TypeScript widens `false` to `boolean`, losing compile-time
 * guarantees. TypeScript resolves overloads top-to-bottom until one matches.
 *
 * @see Adapter - Return type parameterized by TClonable
 * @see createAsyncAdapter - Uses same pattern
 */

/**
 * Configuration object for creating an adapter (INPUT to `createAdapter()`).
 *
 * ## Type Relationships
 *
 * ```
 * AdapterConfig ──createAdapter()──> Adapter
 *      │                                 │
 *      │ (input config)                  │ (output type)
 *      │                                 │
 *      └─ 4 type params                  └─ 6 type params
 *         (provides, requires,              (adds factoryKind, requiresTuple;
 *          lifetime, clonable)               converts requires tuple→union)
 * ```
 *
 * @see Adapter - The output type produced by `createAdapter()`
 * @see AdapterConstraint - Structural constraint for generics (in adapter-types.ts)
 * @see adapter-types.ts - Full disambiguation table for Adapter/AdapterConstraint/AdapterConfig
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
 * @pure No side effects - same inputs always produce the same frozen Adapter object.
 *
 * ## Overload Resolution Table
 *
 * TypeScript resolves overloads top-to-bottom. This function has 3 overloads to preserve
 * literal types for the `clonable` property:
 *
 * ```
 * ┌────────────────────────────────────────────────────────────────────────────────────┐
 * │                        createAdapter() Overload Resolution                         │
 * ├─────────────────────────────────┬───────────────────────┬──────────────────────────┤
 * │ Input Pattern                   │ Matched Overload      │ Result `clonable` Type   │
 * ├─────────────────────────────────┼───────────────────────┼──────────────────────────┤
 * │ clonable: undefined             │ Overload 1 (this one) │ false (literal)          │
 * │ clonable: omitted               │ Overload 1 (this one) │ false (literal)          │
 * │ clonable: true                  │ Overload 2            │ true (literal)           │
 * │ clonable: false                 │ Overload 2            │ false (literal)          │
 * │ clonable: someVar (boolean)     │ Overload 3            │ boolean (widened)        │
 * │ clonable: condition ? true : f  │ Overload 3            │ boolean (widened)        │
 * └─────────────────────────────────┴───────────────────────┴──────────────────────────┘
 * ```
 *
 * ## Type Parameter Inference Table
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────────────────────────┐
 * │                         Type Parameter Inference Rules                              │
 * ├────────────────┬───────────────────────────────┬────────────────────────────────────┤
 * │ Parameter      │ Inferred From                 │ Notes                              │
 * ├────────────────┼───────────────────────────────┼────────────────────────────────────┤
 * │ TProvides      │ config.provides               │ Port<TService, TPortName>          │
 * │ TRequires      │ config.requires               │ readonly tuple via `const`         │
 * │ TLifetime      │ config.lifetime               │ "singleton"|"scoped"|"transient"   │
 * │ TClonable      │ config.clonable (Overload 2)  │ true|false literal or boolean      │
 * └────────────────┴───────────────────────────────┴────────────────────────────────────┘
 * ```
 *
 * ## Invariants
 *
 * **Preconditions:**
 * - `config.provides` must be a valid Port created by `createPort()`
 * - `config.requires` must be an array of valid Ports (can be empty)
 * - `config.lifetime` must be one of: "singleton" | "scoped" | "transient"
 * - `config.factory` must be a function that accepts resolved dependencies
 *
 * **Postconditions:**
 * - Returns a frozen (immutable) Adapter object
 * - `adapter.factoryKind` is always "sync"
 * - `adapter.clonable` is `false` unless explicitly set
 * - The adapter can be safely registered with `GraphBuilder.provide()`
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
  // Runtime validation for better error messages (especially for JS consumers)
  assertValidAdapterConfig(config, false);

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
 * ## Async Adapter Overloads
 *
 * Uses same three-overload pattern as `createAdapter` for `clonable` type preservation.
 * Key differences: `lifetime` is always `"singleton"`, `factoryKind` is `"async"`.
 *
 * @see createAdapter - Full overload rationale documentation
 */

/**
 * Configuration object for creating an async adapter (INPUT to `createAsyncAdapter()`).
 *
 * Similar to `AdapterConfig` but without `lifetime` (always "singleton" for async adapters).
 *
 * @see AdapterConfig - Sync adapter config with explicit lifetime
 * @see Adapter - The output type produced by `createAsyncAdapter()`
 * @see adapter-types.ts - Full disambiguation table
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
 * @pure No side effects - same valid inputs always produce the same frozen Adapter object.
 *
 * ## Overload Resolution Table
 *
 * TypeScript resolves overloads top-to-bottom. This function has 3 overloads to preserve
 * literal types for the `clonable` property (same pattern as `createAdapter()`):
 *
 * ```
 * ┌────────────────────────────────────────────────────────────────────────────────────┐
 * │                      createAsyncAdapter() Overload Resolution                      │
 * ├─────────────────────────────────┬───────────────────────┬──────────────────────────┤
 * │ Input Pattern                   │ Matched Overload      │ Result `clonable` Type   │
 * ├─────────────────────────────────┼───────────────────────┼──────────────────────────┤
 * │ clonable: undefined             │ Overload 1 (this one) │ false (literal)          │
 * │ clonable: omitted               │ Overload 1 (this one) │ false (literal)          │
 * │ clonable: true                  │ Overload 2            │ true (literal)           │
 * │ clonable: false                 │ Overload 2            │ false (literal)          │
 * │ clonable: someVar (boolean)     │ Overload 3            │ boolean (widened)        │
 * │ clonable: condition ? true : f  │ Overload 3            │ boolean (widened)        │
 * └─────────────────────────────────┴───────────────────────┴──────────────────────────┘
 * ```
 *
 * ## Key Differences from createAdapter()
 *
 * | Property        | createAdapter()                    | createAsyncAdapter()               |
 * |-----------------|------------------------------------|------------------------------------|
 * | `lifetime`      | Required: "singleton"|"scoped"|"transient" | Always "singleton" (implicit) |
 * | `factoryKind`   | Always "sync"                      | Always "async"                     |
 * | `factory` return| `TService`                         | `Promise<TService>`                |
 *
 * ## Invariants
 *
 * **Preconditions:**
 * - `config.provides` must be a valid Port created by `createPort()`
 * - `config.requires` must be an array of valid Ports (can be empty)
 * - `config.factory` must be an async function returning a Promise
 *
 * **Postconditions:**
 * - Returns a frozen (immutable) Adapter object
 * - `adapter.factoryKind` is always "async"
 * - `adapter.lifetime` is always "singleton" (async adapters cannot be scoped/transient)
 * - `adapter.clonable` is `false` unless explicitly set
 * - The adapter requires `container.initialize()` before sync resolution
 *
 * **Initialization Order:**
 * - Async adapters are automatically initialized in topological order based on their dependencies
 * - Adapters with no async dependencies initialize first
 * - Independent adapters at the same level initialize in parallel for performance
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
 * This overload catches cases where `clonable` is passed as a variable with type `boolean | undefined`.
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
  // Runtime validation for better error messages (especially for JS consumers)
  assertValidAdapterConfig(config, true);

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
