/**
 * Dependency Satisfaction Logic for @hex-di/graph.
 *
 * This module provides type-level utilities for tracking which dependencies
 * are satisfied as adapters are added to a graph. The core pattern is
 * **union subtraction** using TypeScript's `Exclude` utility type.
 *
 * ## Core Insight
 *
 * As adapters are added, we track two type-level unions:
 * - `TProvides`: All ports that have been provided (have adapters)
 * - `TRequires`: All ports that are required (dependencies of adapters)
 *
 * The graph is complete when `TRequires ⊆ TProvides` (every required port is provided).
 *
 * ## Inspiration
 *
 * This pattern is inspired by Effect-TS Layer composition, where services declare
 * their requirements via type parameters, and composition removes satisfied
 * requirements from the type signature.
 *
 * @see https://effect.website/docs/requirements-management/layers
 * @packageDocumentation
 */

/**
 * Calculates the set of missing dependencies by subtracting provided ports from required ports.
 *
 * This is the foundational type for dependency tracking. It uses TypeScript's built-in
 * `Exclude<T, U>` which removes from T all members that are assignable to U.
 *
 * @typeParam TProvides - Union of provided Port types
 * @typeParam TRequires - Union of required Port types
 *
 * @returns Union of ports that are in TRequires but not in TProvides
 *
 * @remarks
 * **How it works:**
 * - `Exclude` is a distributive conditional type
 * - For each member of TRequires, it checks if that member exists in TProvides
 * - If yes, it's excluded; if no, it's kept in the result
 *
 * @example
 * ```typescript
 * type Provided = LoggerPort | DatabasePort;
 * type Required = LoggerPort | DatabasePort | CachePort;
 * type Missing = UnsatisfiedDependencies<Provided, Required>;
 * // Result: CachePort (only CachePort is not in Provided)
 * ```
 *
 * @internal
 */
export type UnsatisfiedDependencies<TProvides, TRequires> = Exclude<TRequires, TProvides>;

/**
 * Checks if all required dependencies are satisfied by the provided ports.
 *
 * @typeParam TProvides - Union of provided Port types
 * @typeParam TRequires - Union of required Port types
 *
 * @returns `true` if all requirements are met, `false` otherwise
 *
 * @remarks
 * **Why `[T] extends [never]` instead of `T extends never`?**
 *
 * This is a critical TypeScript idiom. The naive check `T extends never` doesn't work
 * because `never` is the "bottom type" - it's assignable to everything, so the condition
 * is always true in a vacuous sense.
 *
 * By wrapping in a tuple `[T]`, we prevent TypeScript's distributive behavior and
 * perform a direct structural comparison. Only when T is exactly `never` will
 * `[never] extends [never]` be true.
 *
 * @example
 * ```typescript
 * // Without tuple wrapper (WRONG):
 * type Bad<T> = T extends never ? true : false;
 * type Test1 = Bad<never>;  // never (not true!)
 *
 * // With tuple wrapper (CORRECT):
 * type Good<T> = [T] extends [never] ? true : false;
 * type Test2 = Good<never>;  // true
 * ```
 *
 * @internal
 */
export type IsSatisfied<TProvides, TRequires> = [
  UnsatisfiedDependencies<TProvides, TRequires>,
] extends [never]
  ? true
  : false;

/**
 * Finds the intersection (overlap) between two unions of Port types.
 *
 * Uses TypeScript's built-in `Extract<T, U>` which keeps only members of T
 * that are assignable to U. This is the inverse of `Exclude`.
 *
 * @typeParam A - First union of Port types
 * @typeParam B - Second union of Port types
 *
 * @returns Union of ports present in both A and B
 *
 * @remarks
 * Used for duplicate detection: if a new adapter provides a port that's already
 * provided, `Extract<NewPort, ExistingPorts>` will return that port.
 *
 * @internal
 */
export type OverlappingPorts<A, B> = Extract<A, B>;

/**
 * Checks if two unions of Port types have any overlap.
 *
 * @typeParam A - First union of Port types
 * @typeParam B - Second union of Port types
 *
 * @returns `true` if there is overlap, `false` otherwise
 *
 * @remarks
 * Uses the same `[T] extends [never]` pattern as `IsSatisfied` to correctly
 * detect when the overlap is empty (no duplicates).
 *
 * @example
 * ```typescript
 * type HasDupe = HasOverlap<LoggerPort, LoggerPort | DatabasePort>;
 * // Result: true (LoggerPort is in both)
 *
 * type NoDupe = HasOverlap<CachePort, LoggerPort | DatabasePort>;
 * // Result: false (CachePort is not in the second union)
 * ```
 *
 * @internal
 */
export type HasOverlap<A, B> = [OverlappingPorts<A, B>] extends [never] ? false : true;

/**
 * Conditional type that evaluates to a valid graph representation when dependencies
 * are satisfied, or an error type with missing dependency information when not.
 *
 * @typeParam TProvides - Union of provided Port types
 * @typeParam TRequires - Union of required Port types
 *
 * @returns A valid graph type if satisfied, or error type with `__missing` property
 *
 * @remarks
 * This is a "type-state" pattern: the shape of the returned type changes based on
 * whether validation passes. Downstream code can use the `__valid` discriminant
 * to narrow the type and access either `__provides` or `__missing`.
 *
 * Note: This type is not currently used in the main API (GraphBuilder uses template
 * literal error messages instead), but is kept for potential future use cases.
 */
export type ValidGraph<TProvides, TRequires> =
  IsSatisfied<TProvides, TRequires> extends true
    ? { readonly __valid: true; readonly __provides: TProvides }
    : {
        readonly __valid: false;
        readonly __missing: UnsatisfiedDependencies<TProvides, TRequires>;
      };
