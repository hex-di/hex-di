/**
 * Core adapter types.
 *
 * This module defines the Adapter type and AdapterConstraint constraint that form the
 * foundation of the adapter system. An adapter captures the complete contract
 * between a port (interface) and its implementation.
 *
 * @packageDocumentation
 */

import type { InferService, InferPortName, Port } from "../ports/types.js";

// =============================================================================
// Brand Symbols
// =============================================================================

/**
 * Unique symbol used for nominal typing of Adapter types.
 *
 * This is a **phantom brand** - it exists only at the type level and has no
 * runtime representation. The `declare const` ensures TypeScript treats it
 * as a unique symbol type without generating any JavaScript code.
 *
 * @see Adapter - Uses this brand for nominal typing
 */
declare const __adapterBrand: unique symbol;

// =============================================================================
// Factory Kind Type
// =============================================================================

/**
 * Discriminator for sync vs async factory functions.
 */
export type FactoryKind = "sync" | "async";

// =============================================================================
// Lifetime Type
// =============================================================================

/**
 * Lifetime scope for an adapter's service instance.
 *
 * | Lifetime    | Description                                                      |
 * |-------------|------------------------------------------------------------------|
 * | `singleton` | One instance per container, shared across all resolutions        |
 * | `scoped`    | One instance per scope, isolated from parent and sibling scopes  |
 * | `transient` | New instance on every resolution                                 |
 */
export type Lifetime = "singleton" | "scoped" | "transient";

// =============================================================================
// ResolvedDeps Helper Type
// =============================================================================

/**
 * Brand symbol for EmptyDeps to prevent arbitrary key access.
 * Uses `declare const` for phantom typing (no runtime footprint).
 */
declare const __emptyDepsBrand: unique symbol;

/**
 * Type representing empty dependencies (no required ports).
 *
 * This is a branded empty type that:
 * - IS assignable from empty object literals: `const deps: EmptyDeps = {}` ✓
 * - PREVENTS arbitrary key access: `deps.nonExistent` ✗ (type error)
 *
 * The brand uses `?: never` which means the property can only be satisfied
 * by omitting it entirely (since `never` has no values). This makes `{}`
 * assignable while preventing index access.
 */
export type EmptyDeps = {
  readonly [__emptyDepsBrand]?: never;
};

/**
 * Maps a union of Port types to an object type for dependency injection.
 *
 * When `TRequires` is `never` (no dependencies), returns `EmptyDeps` which
 * is a branded empty type that prevents arbitrary key access.
 *
 * When `TRequires` is a Port union, returns an object type with port names
 * as keys and service types as values.
 *
 * @example
 * ```typescript
 * // No dependencies - returns EmptyDeps (branded empty type)
 * type NoDeps = ResolvedDeps<never>;
 * const deps: NoDeps = {}; // ✓ OK
 * deps.anything; // ✗ Error: Property 'anything' does not exist
 *
 * // With dependencies - returns mapped object type
 * type WithDeps = ResolvedDeps<typeof LoggerPort | typeof DatabasePort>;
 * // { Logger: Logger; Database: Database }
 * ```
 */
export type ResolvedDeps<TRequires> = [TRequires] extends [never]
  ? EmptyDeps
  : {
      [TPort in TRequires as InferPortName<TPort> & string]: InferService<TPort>;
    };

// =============================================================================
// Adapter Type
// =============================================================================

/**
 * A branded adapter type that captures the complete contract for a service implementation.
 *
 * ## Type Parameter Constraints
 *
 * | Parameter     | Constraint           | Purpose                                    |
 * |---------------|----------------------|--------------------------------------------|
 * | `TProvides`   | `out` (covariant)    | Port type this adapter implements          |
 * | `TRequires`   | invariant            | Union of required port types               |
 * | `TLifetime`   | `extends Lifetime`   | Declared lifetime (normalized for async) |
 * | `TFactoryKind`| `extends FactoryKind`| Must be "sync" | "async"                   |
 * | `TClonable`   | `extends boolean`    | Literal `true` or `false`                  |
 * | `TRequiresTuple`| derived            | Computed from TRequires for runtime array  |
 *
 * ## Variance Annotations
 *
 * The `out` modifier on `TProvides`, `TFactoryKind`, `TClonable`, and `TRequiresTuple`
 * marks them as covariant-only. This means:
 * - `Adapter<DerivedPort, ...>` is assignable to `Adapter<BasePort, ...>`
 * - Enables correct subtyping for adapters in collections
 *
 * `TRequires` is invariant (no modifier) because:
 * - The factory function both reads (contravariant) and returns (covariant) based on it
 * - Changing `TRequires` changes the factory signature bidirectionally
 *
 * ## Example
 *
 * ```typescript
 * // Full type signature of an adapter:
 * type LoggerAdapter = Adapter<
 *   typeof LoggerPort,  // TProvides: the port being implemented
 *   never,              // TRequires: no dependencies (never = empty union)
 *   "singleton",        // TLifetime: instance lifetime
 *   "sync",             // TFactoryKind: synchronous factory
 *   false,              // TClonable: not safe to shallow-clone
 *   readonly []         // TRequiresTuple: empty tuple (computed from TRequires)
 * >;
 * ```
 */
export type Adapter<
  out TProvides,
  TRequires,
  TLifetime extends string, // Widened to accept error message strings
  out TFactoryKind extends FactoryKind = "sync",
  out TClonable extends boolean = false,
  out TRequiresTuple extends readonly unknown[] = [TRequires] extends [never]
    ? readonly []
    : readonly TRequires[],
> = {
  /**
   * Brand property for nominal typing.
   */
  readonly [__adapterBrand]?: [TProvides, TRequires, TLifetime, TFactoryKind, TClonable];

  /**
   * The port this adapter provides/implements.
   */
  readonly provides: TProvides;

  /**
   * The ports this adapter depends on.
   */
  readonly requires: TRequiresTuple;

  /**
   * The lifetime scope for this adapter's service instances.
   *
   * For sync factories, this is the declared lifetime.
   * For async factories, this is either "singleton" (valid) or an error message
   * string (invalid - when non-singleton lifetime was specified with async factory).
   *
   * The error string makes the adapter unusable with GraphBuilder, producing
   * a compile-time error.
   */
  readonly lifetime: TLifetime;

  /**
   * The factory kind discriminator.
   */
  readonly factoryKind: TFactoryKind;

  /**
   * Factory function that creates the service instance.
   */
  readonly factory: TFactoryKind extends "async"
    ? (deps: ResolvedDeps<TRequires>) => Promise<InferService<TProvides>>
    : (deps: ResolvedDeps<TRequires>) => InferService<TProvides>;

  /**
   * Whether this adapter's service can be safely shallow-cloned.
   *
   * When `true`, the adapter's instances can be used with forked inheritance mode,
   * which creates a shallow clone for child containers.
   *
   * When `false` (default), forked inheritance mode will fail at compile time,
   * requiring the use of shared or isolated mode instead.
   *
   * @remarks
   * Mark as clonable only for services that:
   * - Have no resource handles (sockets, file handles, connections)
   * - Have no external references that would become shared
   * - Are value-like objects where shallow cloning produces valid instances
   *
   * @default false
   */
  readonly clonable: TClonable;

  /**
   * Optional finalizer function called during disposal.
   */
  finalizer?(instance: InferService<TProvides>): void | Promise<void>;
};

// =============================================================================
// AdapterConstraint - Universal Adapter Constraint (Zero `any` Types)
// =============================================================================

/**
 * Structural interface matching ANY Adapter without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL Adapters
 * are assignable to:
 * - `unknown` in covariant positions (outputs/reads)
 * - `never` in contravariant positions (inputs/writes)
 *
 * When used as a constraint `<A extends AdapterConstraint>`, the generic parameter `A`
 * preserves the EXACT adapter type for full inference.
 *
 * @example
 * ```typescript
 * // All adapters match this constraint
 * function process<A extends AdapterConstraint>(adapter: A): InferAdapterProvides<A> {
 *   // A is inferred as exact adapter type, not widened to AdapterConstraint
 * }
 *
 * const result = process(LoggerAdapter);
 * // result is LoggerPort, not unknown!
 * ```
 *
 * @remarks
 * This follows the Effect-TS pattern of `Layer.Any`, `Service.Any` interfaces.
 * The key insight is that we only match the STRUCTURE of an Adapter, not its
 * exact type parameters, while preserving full type inference through generics.
 */
export interface AdapterConstraint {
  /**
   * The port this adapter provides (read-only, covariant).
   * Uses Port<unknown, string> as the widest Port type.
   */
  readonly provides: Port<unknown, string>;

  /**
   * The ports this adapter depends on (read-only, covariant).
   * Each element is a Port with `__portName` for runtime identification.
   */
  readonly requires: readonly Port<unknown, string>[];

  /**
   * The lifetime scope (fixed union, all values assignable).
   */
  readonly lifetime: Lifetime;

  /**
   * The factory kind discriminator (fixed union, all values assignable).
   */
  readonly factoryKind: FactoryKind;

  /**
   * Factory function (contravariant in params, covariant in return).
   * `never[]` params accept any function signature.
   */
  readonly factory: (...args: never[]) => unknown;

  /**
   * Whether this adapter's service can be safely shallow-cloned.
   * Defaults to false for safety.
   */
  readonly clonable: boolean;

  /**
   * Optional finalizer (contravariant param accepts any instance type).
   */
  finalizer?(instance: never): void | Promise<void>;
}
