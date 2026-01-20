import type { InferService, InferPortName, Port } from "@hex-di/ports";

// =============================================================================
// Brand Symbols
// =============================================================================
//
// ## Symbol Naming Convention
//
// This codebase uses two distinct naming conventions for symbols:
//
// - **`__brandName`** (double underscore, camelCase): Type-level phantom brands
//   - Declared with `declare const`, never assigned at runtime
//   - Used for nominal typing at compile-time only
//   - Examples: `__adapterBrand`, `__graphBuilderBrand`
//
// - **`BRAND_NAME`** (SCREAMING_SNAKE_CASE): Runtime symbol constants
//   - Assigned with `Symbol()`, used at runtime for instance checks
//   - Examples: `GRAPH_BUILDER_BRAND`
//
// This distinction makes it clear whether a symbol exists only at the type
// level (no runtime footprint) or is an actual runtime value.
//

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
 */
export type Lifetime = "singleton" | "scoped" | "transient";

// =============================================================================
// ResolvedDeps Helper Type
// =============================================================================

/**
 * Maps a union of Port types to an object type for dependency injection.
 */
export type ResolvedDeps<TRequires> = [TRequires] extends [never]
  ? Record<string, unknown>
  : {
      [TPort in TRequires as InferPortName<TPort> & string]: InferService<TPort>;
    };

// =============================================================================
// Adapter Type
// =============================================================================

/**
 * A branded adapter type that captures the complete contract for a service implementation.
 */
export type Adapter<
  out TProvides,
  TRequires,
  TLifetime extends Lifetime,
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
   * Optional initialization priority for async adapters.
   */
  readonly initPriority?: number;

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
// AdapterAny - Universal Adapter Constraint (Zero `any` Types)
// =============================================================================

/**
 * Structural interface matching ANY Adapter without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL Adapters
 * are assignable to:
 * - `unknown` in covariant positions (outputs/reads)
 * - `never` in contravariant positions (inputs/writes)
 *
 * When used as a constraint `<A extends AdapterAny>`, the generic parameter `A`
 * preserves the EXACT adapter type for full inference.
 *
 * @example
 * ```typescript
 * // All adapters match this constraint
 * function process<A extends AdapterAny>(adapter: A): InferAdapterProvides<A> {
 *   // A is inferred as exact adapter type, not widened to AdapterAny
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
 *
 * **Variance explanation:**
 * - `provides: Port<unknown, string>` - Widest Port type (covariant)
 * - `requires: readonly Port<unknown, string>[]` - Array of ports (covariant)
 * - `factory: (...args: never[]) => unknown` - Contravariant in params, covariant in return
 * - `finalizer?(instance: never)` - Contravariant param accepts any input
 */
export interface AdapterAny {
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
   * Optional initialization priority.
   */
  readonly initPriority?: number;

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

// Note: InferClonable and IsClonableAdapter are now in ./inference.ts
// for consistency with other inference utilities. They are re-exported
// via ./index.ts.
