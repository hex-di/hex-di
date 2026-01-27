/**
 * Core adapter types.
 *
 * This module defines the Adapter type and AdapterConstraint constraint that form the
 * foundation of the adapter system. An adapter captures the complete contract
 * between a port (interface) and its implementation.
 *
 * @packageDocumentation
 */

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
 *
 * ## Why Not Record<string, unknown>?
 *
 * The previous implementation used `Record<string, unknown>` which allowed:
 * ```typescript
 * const deps: ResolvedDeps<never> = {};
 * deps.nonExistent; // No error! Returns `unknown` - this is unsound
 * ```
 *
 * This was a type safety gap because factory functions with no dependencies
 * could access arbitrary keys without type errors.
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
// ↓ `[TRequires] extends [never]`: Tuple wrapping prevents distributive behavior.
//   Without wrapping: `never extends never` is always true (vacuous truth).
//   With wrapping: `[never] extends [never]` only true when TRequires is literally never.
export type ResolvedDeps<TRequires> = [TRequires] extends [never]
  ? EmptyDeps // ← No dependencies: branded empty type (prevents arbitrary key access)
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
 *
 * ## Type Parameter Flow Diagram
 *
 * Shows how each type parameter maps to runtime properties:
 *
 * ```
 * ┌────────────────────────────────────────────────────────────────┐
 * │                    Adapter<...> Type                          │
 * ├────────────────────┬───────────────────────────────────────────┤
 * │  Type Parameter    │  Runtime Property                        │
 * ├────────────────────┼───────────────────────────────────────────┤
 * │  TProvides         │  provides: TProvides                     │
 * │  TRequires         │  factory(deps: ResolvedDeps<TRequires>)  │
 * │  TLifetime         │  lifetime: (normalized for async)        │
 * │  TFactoryKind      │  factoryKind: TFactoryKind               │
 * │  TClonable         │  clonable: TClonable                     │
 * │  TRequiresTuple    │  requires: TRequiresTuple                │
 * └────────────────────┴───────────────────────────────────────────┘
 * ```
 *
 * ## Note on TRequiresTuple Default
 *
 * The default `readonly TRequires[]` produces an array type, not a tuple.
 * This is intentional - the default exists only for type constraint satisfaction.
 * In practice, explicit tuple types are always provided via `createAdapter` overloads
 * which preserve the exact dependency order as a tuple type like `readonly [PortA, PortB]`.
 * The default is never used in actual adapter construction.
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
   *
   * **Normalization Rule**: Async adapters are always singletons regardless of
   * the declared `TLifetime`. This is because async initialization (returning
   * a Promise) implies the instance must be cached to avoid re-initializing
   * on each resolution. The type reflects this constraint:
   * - `TFactoryKind extends "async"` → `lifetime: "singleton"`
   * - `TFactoryKind extends "sync"` → `lifetime: TLifetime` (as declared)
   */
  readonly lifetime: TFactoryKind extends "async" ? "singleton" : TLifetime;

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
// `never` vs `unknown`: A Complete Reference
// =============================================================================
//
// This codebase uses `never` and `unknown` strategically based on TypeScript's
// variance rules. Understanding when to use each is critical for type safety.
//
// ## Quick Reference
//
// | Use Case                        | Type      | Why                              |
// |---------------------------------|-----------|----------------------------------|
// | "Empty" union (no values)       | `never`   | Union identity: `T | never = T`  |
// | "Unknown" value (any value)     | `unknown` | Top type, requires narrowing     |
// | Function parameter constraint   | `never`   | Contravariant: accepts any fn    |
// | Function return constraint      | `unknown` | Covariant: accepts any return    |
// | Uninitialized type param        | `never`   | Grows via union: `never | T = T` |
// | Error/impossible branch         | `never`   | Indicates unreachable code       |
//
// ## never: The Bottom Type
//
// `never` is the "bottom type" - it has NO inhabitants. Nothing is assignable
// to `never` except `never` itself. Use it when:
//
// 1. **Empty unions**: `TRequires` starts as `never` (no requirements)
//    ```typescript
//    type Empty = never;           // No ports required
//    type OnePort = Empty | A;     // Now requires A
//    type TwoPorts = OnePort | B;  // Now requires A | B
//    ```
//
// 2. **Contravariant constraints**: Function parameters accepting ANY function
//    ```typescript
//    // This accepts functions with ANY parameter type:
//    type AnyFn = (...args: never[]) => unknown;
//    const fn1: AnyFn = (x: string) => x;  // OK
//    const fn2: AnyFn = (x: number) => x;  // OK
//    ```
//
// 3. **Impossible branches**: Exhaustiveness checking
//    ```typescript
//    function exhaustive(x: "a" | "b"): string {
//      if (x === "a") return "A";
//      if (x === "b") return "B";
//      const _exhaustive: never = x;  // Error if cases missed
//      return _exhaustive;
//    }
//    ```
//
// ## unknown: The Top Type
//
// `unknown` is the "top type" - ALL values are assignable to `unknown`.
// It's the type-safe alternative to `any`. Use it when:
//
// 1. **Covariant constraints**: Return types that accept ANY return value
//    ```typescript
//    // This accepts functions returning ANY type:
//    type AnyReturn = () => unknown;
//    const fn1: AnyReturn = () => "string";  // OK
//    const fn2: AnyReturn = () => 42;        // OK
//    ```
//
// 2. **Read-only properties**: Accepting any value for reading
//    ```typescript
//    interface Container { readonly value: unknown }
//    const c1: Container = { value: "string" };  // OK
//    const c2: Container = { value: 42 };        // OK
//    ```
//
// 3. **Unknown data**: External input that needs validation
//    ```typescript
//    function process(data: unknown): string {
//      if (typeof data === "string") return data;  // Narrowed
//      throw new Error("Expected string");
//    }
//    ```
//
// ## Common Mistakes
//
// ❌ Using `any` instead of `unknown`:
//    `any` bypasses type checking entirely. Use `unknown` and narrow.
//
// ❌ Using `never` for "no value yet":
//    Use `undefined` or optional property, not `never`.
//
// ❌ Using `unknown` for empty union:
//    `T | unknown = unknown`, which absorbs all types. Use `never`.
//
// ❌ Using `never` for accepting any value:
//    Nothing is assignable to `never`. Use `unknown`.
//
// =============================================================================
// AdapterConstraint - Universal Adapter Constraint (Zero `any` Types)
// =============================================================================
//
// ## DISAMBIGUATION: Adapter<...> vs AdapterConstraint vs AdapterConfig
//
// | Type               | Module      | Use When                                        | Example                              |
// |--------------------|-------------|-------------------------------------------------|--------------------------------------|
// | `Adapter<...>`     | types       | Result type from createAdapter(), stored in graph | `type MyAdapter = Adapter<...>`      |
// | `AdapterConstraint`| types       | Constraint in generic functions/classes         | `function f<A extends AdapterConstraint>()`|
// | `AdapterConfig`    | factory     | Input config to createAdapter() function        | `createAdapter({ provides, requires, ...})` |
//
// ### Key Differences:
//
// - **`Adapter<...>`**: The OUTPUT type - what you get back from `createAdapter()`.
//   Has 6 type parameters capturing provides, requires, lifetime, factoryKind, clonable, and requiresTuple.
//   This is what gets stored in the dependency graph.
//
// - **`AdapterConstraint`**: A structural interface for type constraints.
//   Uses variance (unknown/never) to match ANY Adapter without losing type info through generics.
//   NOT meant as a direct type for variables - use as `<A extends AdapterConstraint>` to preserve A's exact type.
//
// - **`AdapterConfig`**: The INPUT type - what you pass TO `createAdapter()`.
//   Defined in factory.ts. Has 4 type parameters (provides, requires, lifetime, clonable).
//   The factory function transforms AdapterConfig → Adapter, adding factoryKind and converting requires tuple to union.
//
// **Key Insight**: `AdapterConstraint` is NOT meant to be used directly as a type for
// variables. It's a CONSTRAINT that allows ANY adapter to match while preserving
// the exact type through generic inference:
//
// ```typescript
// // CORRECT: Use AdapterConstraint as a constraint, the actual type A is preserved
// function processAdapter<A extends AdapterConstraint>(adapter: A): InferAdapterProvides<A> {
//   // A is the EXACT adapter type, not widened to AdapterConstraint
// }
//
// // WRONG: Using AdapterConstraint directly loses type information
// function processAdapter(adapter: AdapterConstraint): unknown {
//   // adapter.provides is Port<unknown, string>, not the actual port type!
// }
// ```
//
// ## Understanding Variance in AdapterConstraint
//
// TypeScript uses variance to determine type compatibility:
//
// | Position       | Variance       | Widest Type | Why                                    |
// |----------------|----------------|-------------|----------------------------------------|
// | Return/output  | Covariant      | `unknown`   | Any return type is assignable          |
// | Parameter/input| Contravariant  | `never`     | Any param type accepts `never` args    |
// | Read-only prop | Covariant      | `unknown`   | Reading: any value can be unknown      |
// | Method param   | Contravariant  | `never`     | Calling: never is compatible with all  |
//
// By using the widest possible types at each position, AdapterConstraint accepts
// ANY adapter while avoiding the type unsafety of `any`.
//
// ## The Pattern
//
// ```typescript
// interface AdapterConstraint {
//   readonly provides: Port<unknown, string>;  // Covariant: unknown accepts all
//   readonly factory: (...args: never[]) => unknown;  // Contra + Co
//   finalizer?(instance: never): void;  // Contravariant parameter
// }
// ```
//
// This is the same pattern used in Effect-TS for Layer.Any, Service.Any, etc.
//

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
 *
 * @see GLOSSARY.md for explanation of variance terminology
 */
export interface AdapterConstraint {
  /**
   * The port this adapter provides (read-only, covariant).
   * Uses Port<unknown, string> as the widest Port type.
   */
  // ↓ `unknown`: Covariant position (output/read) - any Port<T, N> is assignable to Port<unknown, string>
  readonly provides: Port<unknown, string>;

  /**
   * The ports this adapter depends on (read-only, covariant).
   * Each element is a Port with `__portName` for runtime identification.
   */
  // ↓ `unknown`: Covariant (readonly array elements are covariant) - any Port array is assignable
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
  // ↓ `never[]`: Contravariant (params) - accepts functions with ANY param type
  // ↓ `unknown`: Covariant (return) - accepts functions returning ANY type
  readonly factory: (...args: never[]) => unknown;

  /**
   * Whether this adapter's service can be safely shallow-cloned.
   * Defaults to false for safety.
   */
  readonly clonable: boolean;

  /**
   * Optional finalizer (contravariant param accepts any instance type).
   */
  // ↓ `never`: Contravariant (param) - accepts finalizers taking ANY instance type
  finalizer?(instance: never): void | Promise<void>;
}

// Note: InferClonable and IsClonableAdapter are now in ./inference.ts
// for consistency with other inference utilities. They are re-exported
// via ./index.ts.
