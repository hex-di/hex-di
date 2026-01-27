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
 * ## `never` Semantics: Empty Set
 *
 * When this type returns `never`, it means **"empty set - all dependencies are satisfied"**.
 * This is the "good" case indicating the graph is complete and ready to build.
 *
 * ```
 * never = ∅ (empty set) = all deps satisfied = ready to build
 * ```
 *
 * Use `IsNever<UnsatisfiedDependencies<P, R>>` to check if all deps are met.
 *
 * @typeParam TProvides - Union of provided Port types
 * @typeParam TRequires - Union of required Port types
 *
 * @returns Union of ports that are in TRequires but not in TProvides;
 *          `never` when all requirements are satisfied (empty set)
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
 * @example Complete graph
 * ```typescript
 * type Provided = LoggerPort | DatabasePort;
 * type Required = LoggerPort | DatabasePort;
 * type Missing = UnsatisfiedDependencies<Provided, Required>;
 * // Result: never (empty set - all deps satisfied)
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
    UnsatisfiedDependencies<TProvides, TRequires>
] extends [never] ? true : false;
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
export type OverlappingPorts<TPortsA, TPortsB> = Extract<TPortsA, TPortsB>;
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
export type HasOverlap<TPortsA, TPortsB> = [OverlappingPorts<TPortsA, TPortsB>] extends [never] ? false : true;
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
 *
 * @internal
 */
export type ValidGraph<TProvides, TRequires> = IsSatisfied<TProvides, TRequires> extends true ? {
    readonly __valid: true;
    readonly __provides: TProvides;
} : {
    readonly __valid: false;
    readonly __missing: UnsatisfiedDependencies<TProvides, TRequires>;
};
/**
 * Finds dependencies in Graph A that would be newly satisfied by Graph B.
 *
 * "Newly satisfied" means: required by A, NOT provided by A, but provided by B.
 * These are dependencies that were intentionally left unsatisfied in A, but
 * accidentally become satisfied when merged with B.
 *
 * @typeParam AProvides - Ports provided by Graph A
 * @typeParam ARequires - Ports required by Graph A
 * @typeParam BProvides - Ports provided by Graph B
 *
 * @returns Union of port types that become satisfied after merge
 *
 * @example
 * ```typescript
 * // Graph A: UserService requires Logger but doesn't provide it
 * // Graph B: Provides Logger
 * type Satisfied = NewlySatisfiedDependencies<
 *   UserServicePort,    // A provides
 *   LoggerPort,         // A requires
 *   LoggerPort          // B provides
 * >;
 * // Result: LoggerPort - this dependency becomes satisfied!
 * ```
 *
 * @internal
 */
export type NewlySatisfiedDependencies<AProvides, ARequires, BProvides> = Extract<Exclude<ARequires, AProvides>, BProvides>;
/**
 * Detects all dependencies that become satisfied when merging two graphs.
 *
 * This type utility checks both directions:
 * - Dependencies in A that B would satisfy
 * - Dependencies in B that A would satisfy
 *
 * **When to use**: In type tests to validate that merge doesn't create
 * unintentional coupling. A return type of `never` means the merge is "clean"
 * with no implicit dependency satisfaction.
 *
 * @typeParam AProvides - Ports provided by Graph A
 * @typeParam ARequires - Ports required by Graph A
 * @typeParam BProvides - Ports provided by Graph B
 * @typeParam BRequires - Ports required by Graph B
 *
 * @returns Union of port types that become satisfied, or `never` if clean
 *
 * @example
 * ```typescript
 * // In your type tests:
 * type Satisfied = MergeSatisfiesDependencies<
 *   typeof graphA.__provides, typeof graphA.__requires,
 *   typeof graphB.__provides, typeof graphB.__requires
 * >;
 * expectTypeOf<Satisfied>().toBeNever(); // Fails if implicit coupling
 * ```
 *
 * @internal
 */
export type MergeSatisfiesDependencies<AProvides, ARequires, BProvides, BRequires> = NewlySatisfiedDependencies<AProvides, ARequires, BProvides> | NewlySatisfiedDependencies<BProvides, BRequires, AProvides>;
/**
 * Finds ports that are provided but never required by any adapter.
 *
 * An "orphan port" exists in the graph but has no dependents. This might
 * indicate unused code or missing wiring. However, entry point services
 * (like HTTP controllers or CLI handlers) are legitimately orphans.
 *
 * @typeParam TProvides - Union of all provided ports
 * @typeParam TRequires - Union of all required ports
 *
 * @returns Union of ports that are provided but not required, or `never` if none
 *
 * @example
 * ```typescript
 * // LoggerPort is provided but nothing requires it
 * type Orphans = OrphanPorts<LoggerPort | UserServicePort, DatabasePort>;
 * // Result: LoggerPort (UserServicePort might require Database, but Logger is orphaned)
 *
 * // In your type tests:
 * type GraphOrphans = OrphanPorts<
 *   typeof graph.__provides,
 *   typeof graph.__requires
 * >;
 * // Use with expectTypeOf to check for unexpected orphans
 * ```
 *
 * @remarks
 * **When is this useful?**
 *
 * 1. Library/package development: Ensure all provided services are actually used
 * 2. Refactoring: Detect services that became orphaned after removing dependents
 * 3. Documentation: Understand which services are entry points vs. internal
 *
 * **When NOT to use:**
 *
 * - Entry point graphs (HTTP servers, CLI apps) intentionally have orphan ports
 * - Some architectures have "optional" adapters that may or may not be used
 *
 * @internal
 */
export type OrphanPorts<TProvides, TRequires> = Exclude<TProvides, TRequires>;
