/**
 * Compile-Time Captive Dependency Prevention for @hex-di/graph.
 *
 * Captive dependency is a DI anti-pattern where a longer-lived service
 * (e.g., singleton) depends on a shorter-lived service (e.g., scoped/transient).
 * This causes the shorter-lived service to be "captured" and held beyond
 * its intended lifetime, leading to stale data and memory leaks.
 *
 * ## The Problem
 *
 * ```
 * Singleton A ──depends on──► Scoped B
 *     │                           │
 *     │                           └── Should be recreated per scope
 *     └── Lives forever, holds reference to single B instance
 *
 * Result: B becomes effectively singleton, stale across scopes!
 * ```
 *
 * ## Lifetime Hierarchy
 *
 * We assign numeric levels where LOWER = LONGER LIVED:
 *
 * ```
 * Level 1: Singleton  ───────────────────────────────────► (longest)
 * Level 2: Scoped     ─────────────►
 * Level 3: Transient  ───►                                  (shortest)
 * ```
 *
 * **The Rule:** An adapter's level must be ≥ all its dependencies' levels.
 * - Singleton (1) can depend on: Singleton (1) only
 * - Scoped (2) can depend on: Singleton (1), Scoped (2)
 * - Transient (3) can depend on: Singleton (1), Scoped (2), Transient (3)
 *
 * ## Why Pattern Matching Instead of Arithmetic?
 *
 * TypeScript's type system cannot perform arithmetic operations like
 * `A > B`. We work around this by explicit pattern matching on the
 * three possible values (1, 2, 3). This is efficient because there
 * are only 9 possible comparisons.
 *
 * @see ./cycle-detection.ts - Similar validation for circular dependencies
 * @see ../graph/builder.ts - Uses these types in ProvideResult
 * @packageDocumentation
 */

import type { Lifetime } from "../adapter/types.js";
import type { IsNever } from "../common";

// =============================================================================
// LifetimeLevel Phantom Type
// =============================================================================

/**
 * Maps a Lifetime string literal to its numeric level for comparison.
 *
 * The numeric levels represent the lifetime hierarchy:
 * - Singleton = 1 (longest lived)
 * - Scoped = 2 (medium lived)
 * - Transient = 3 (shortest lived)
 *
 * Lower numbers indicate longer lifetimes. An adapter can only depend on
 * adapters with the same or lower (longer-lived) level.
 *
 * @typeParam L - The Lifetime literal type ('singleton' | 'scoped' | 'transient')
 *
 * @returns The numeric level: 1, 2, or 3
 *
 * @example
 * ```typescript
 * type SingletonLevel = LifetimeLevel<'singleton'>; // 1
 * type ScopedLevel = LifetimeLevel<'scoped'>;       // 2
 * type TransientLevel = LifetimeLevel<'transient'>; // 3
 * ```
 */
export type LifetimeLevel<L extends Lifetime> = L extends "singleton"
  ? 1
  : L extends "scoped"
    ? 2
    : L extends "transient"
      ? 3
      : never;

// =============================================================================
// Lifetime Map Operations
// =============================================================================

/**
 * Adds a port's lifetime level to the lifetime map.
 *
 * Uses a simple intersection to extend the map. The key insight is that
 * we use a branded object type `{ [TPortName]: level }` which TypeScript
 * properly narrows when indexing.
 *
 * @typeParam TMap - The current lifetime map
 * @typeParam TPortName - The port name to add
 * @typeParam TLifetime - The lifetime of the adapter providing this port
 *
 * @example
 * ```typescript
 * type Map1 = {}; // Empty map
 * type Map2 = AddLifetime<Map1, "Logger", "singleton">; // { Logger: 1 }
 * type Map3 = AddLifetime<Map2, "Database", "scoped">; // { Logger: 1, Database: 2 }
 * ```
 */
export type AddLifetime<TMap, TPortName extends string, TLifetime extends Lifetime> = Prettify<
  TMap & { [K in TPortName]: LifetimeLevel<TLifetime> }
>;

/**
 * Utility type to flatten intersection types for better type display and indexing.
 * This forces TypeScript to evaluate the intersection and create a single object type.
 * @internal
 */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Gets the lifetime level for a port from the lifetime map.
 *
 * @typeParam TMap - The lifetime map
 * @typeParam TPortName - The port name to look up
 * @returns The lifetime level (1, 2, or 3), or never if not found
 */
export type GetLifetimeLevel<TMap, TPortName extends string> = TPortName extends keyof TMap
  ? TMap[TPortName] extends number
    ? TMap[TPortName]
    : never
  : never;

// =============================================================================
// Type-Level Comparison Utilities
// =============================================================================
//
// WHY PATTERN MATCHING INSTEAD OF ARITHMETIC?
//
// TypeScript's type system is not Turing-complete for arithmetic. There's
// no way to write `A > B` for arbitrary numbers. We have three approaches:
//
// 1. TUPLE LENGTH COMPARISON (Complex):
//    Build tuples of length A and B, then check if one extends the other.
//    Overkill for 3 values.
//
// 2. LOOKUP TABLES (Verbose):
//    ```
//    type GreaterThan = {
//      1: { 1: false, 2: false, 3: false },
//      2: { 1: true,  2: false, 3: false },
//      3: { 1: true,  2: true,  3: false },
//    }
//    ```
//    Cleaner but requires nested indexing.
//
// 3. PATTERN MATCHING (Used here):
//    Explicit conditionals for each case. Clear and efficient for 3 values.
//
// We chose pattern matching because:
// - Only 3 possible values means 9 total comparisons
// - Code is self-documenting with inline comments
// - No abstraction overhead

/**
 * Type-level "greater than" comparison for lifetime levels.
 *
 * Returns true if level A is greater than level B.
 * Greater level means shorter lifetime, which can cause captive dependency
 * when a longer-lived adapter depends on a shorter-lived one.
 *
 * @typeParam A - First lifetime level (1, 2, or 3)
 * @typeParam B - Second lifetime level (1, 2, or 3)
 *
 * @returns `true` if A > B, `false` otherwise
 *
 * @remarks
 * **Why explicit pattern matching?**
 *
 * TypeScript cannot perform arithmetic at the type level. We enumerate
 * all possible cases explicitly. For 3 lifetime levels, this is efficient
 * and clear. The comparison table:
 *
 * ```
 *     | 1     2     3    (B)
 * ----+-------------------
 *  1  | F     F     F     ← Singleton never > anything
 *  2  | T     F     F     ← Scoped > Singleton only
 *  3  | T     T     F     ← Transient > Singleton, Scoped
 * (A) |
 * ```
 *
 * @internal
 */
type IsGreaterThan<A extends number, B extends number> = A extends 1
  ? false // 1 is never greater than anything (Singleton = longest lived)
  : A extends 2
    ? B extends 1
      ? true // 2 > 1: Scoped > Singleton
      : false // 2 <= 2, 2 <= 3
    : A extends 3
      ? B extends 1 | 2
        ? true // 3 > 1, 3 > 2: Transient > Singleton, Transient > Scoped
        : false // 3 <= 3
      : false;

/**
 * Checks if the dependency lifetime level is greater (shorter-lived) than
 * the dependent's lifetime level, which would create a captive dependency.
 *
 * @typeParam DependentLevel - The lifetime level of the adapter that has the dependency
 * @typeParam DependencyLevel - The lifetime level of the required adapter
 *
 * @returns `true` if this creates a captive dependency, `false` otherwise
 */
export type IsCaptiveDependency<
  DependentLevel extends number,
  DependencyLevel extends number,
> = IsGreaterThan<DependencyLevel, DependentLevel>;

// =============================================================================
// Lifetime Name Extraction for Error Messages
// =============================================================================

/**
 * Converts a lifetime level back to its string name for error messages.
 *
 * @typeParam Level - The numeric lifetime level (1, 2, or 3)
 *
 * @returns The lifetime name as a capitalized string literal
 */
export type LifetimeName<Level> = Level extends 1
  ? "Singleton"
  : Level extends 2
    ? "Scoped"
    : Level extends 3
      ? "Transient"
      : "Unknown";

// =============================================================================
// CaptiveDependencyError Type
// =============================================================================

/**
 * A branded error type that produces a readable compile-time error message
 * when a captive dependency is detected.
 *
 * This type is returned by the captive dependency detection logic when
 * an adapter attempts to depend on an adapter with a shorter lifetime.
 *
 * @typeParam TDependentName - The port name of the adapter with the dependency
 * @typeParam TDependentLifetime - The lifetime name of the dependent adapter
 * @typeParam TCaptivePortName - The port name that would be captured
 * @typeParam TCaptiveLifetime - The lifetime name of the captive dependency
 *
 * @returns A branded error type with descriptive message
 *
 * @example
 * ```typescript
 * type Error = CaptiveDependencyError<"UserService", "Singleton", "Database", "Scoped">;
 * // {
 * //   __valid: false;
 * //   __errorBrand: 'CaptiveDependencyError';
 * //   __message: "Captive dependency: Singleton 'UserService' cannot depend on Scoped 'Database'";
 * // }
 * ```
 */
export type CaptiveDependencyError<
  TDependentName extends string,
  TDependentLifetime extends string,
  TCaptivePortName extends string,
  TCaptiveLifetime extends string,
> = {
  readonly __valid: false;
  readonly __errorBrand: "CaptiveDependencyError";
  readonly __message: `Captive dependency: ${TDependentLifetime} '${TDependentName}' cannot depend on ${TCaptiveLifetime} '${TCaptivePortName}'`;
};

// =============================================================================
// Captive Dependency Detection
// =============================================================================

/**
 * Finds a captive dependency for a single required port.
 *
 * @typeParam TLifetimeMap - The current lifetime map
 * @typeParam TDependentLevel - The lifetime level of the adapter being added
 * @typeParam TRequiredPortName - The name of a required port
 *
 * @returns The port name if it would be captive, or never otherwise
 *
 * @internal
 */
type FindCaptiveDependency<
  TLifetimeMap,
  TDependentLevel extends number,
  TRequiredPortName extends string,
> =
  GetLifetimeLevel<TLifetimeMap, TRequiredPortName> extends infer DepLevel
    ? IsNever<DepLevel> extends true
      ? // Port not in lifetime map yet - this is a "forward reference".
        // Forward references occur when an adapter requires a port that hasn't
        // been registered yet. At compile time, we can't validate the lifetime
        // because we don't know what it will be. This is NOT an error because:
        // 1. If the dependency is never provided, build() will catch it
        // 2. If the dependency is provided later with valid lifetime, no problem
        // 3. If the dependency is provided later with invalid lifetime (captive),
        //    the validation will occur when THAT adapter is added
        // This allows registering adapters in any order without false positives.
        never
      : DepLevel extends number
        ? IsCaptiveDependency<TDependentLevel, DepLevel> extends true
          ? TRequiredPortName // Found a captive dependency!
          : never
        : never
    : never;

/**
 * Finds any captive dependency among all required ports.
 *
 * Uses distributive conditional types to check each required port name
 * and returns the first one that would create a captive dependency.
 *
 * @typeParam TLifetimeMap - The current lifetime map
 * @typeParam TDependentLevel - The lifetime level of the adapter being added
 * @typeParam TRequiredPortNames - Union of all required port names
 *
 * @returns The first captive port name, or never if none found
 */
export type FindAnyCaptiveDependency<
  TLifetimeMap,
  TDependentLevel extends number,
  TRequiredPortNames extends string,
> = TRequiredPortNames extends string
  ? FindCaptiveDependency<TLifetimeMap, TDependentLevel, TRequiredPortNames>
  : never;

// =============================================================================
// Batch Utilities for provideMany and merge
// =============================================================================

/**
 * Merges two lifetime maps together.
 * Used when merging GraphBuilders.
 *
 * Uses Prettify to flatten the intersection for proper indexing.
 *
 * @typeParam TMap1 - First lifetime map
 * @typeParam TMap2 - Second lifetime map
 */
export type MergeLifetimeMaps<TMap1, TMap2> = Prettify<TMap1 & TMap2>;

/**
 * Adds multiple adapters' lifetimes to the lifetime map.
 *
 * @typeParam TMap - Current lifetime map
 * @typeParam TAdapters - Readonly array of adapter types
 */
export type AddManyLifetimes<
  TMap,
  TAdapters extends readonly unknown[],
> = TAdapters extends readonly [infer First, ...infer Rest]
  ? AddManyLifetimes<
      AddLifetime<TMap, AdapterProvidesNameForLifetime<First>, AdapterLifetimeForMap<First>>,
      Rest
    >
  : TMap;

/**
 * Extracts the provides port name from an adapter for lifetime map operations.
 * @internal
 */
type AdapterProvidesNameForLifetime<A> = A extends { provides: { __name: infer Name } }
  ? Name extends string
    ? Name
    : never
  : never;

/**
 * Extracts the lifetime from an adapter for lifetime map operations.
 * @internal
 */
type AdapterLifetimeForMap<A> = A extends { lifetime: infer L }
  ? L extends Lifetime
    ? L
    : "singleton"
  : "singleton";

/**
 * Checks if adding multiple adapters would create any captive dependencies.
 * Returns the first captive error found or false if no captive dependencies.
 *
 * @typeParam TMap - Current lifetime map
 * @typeParam TAdapters - Adapters to check
 */
export type WouldAnyBeCaptive<
  TMap,
  TAdapters extends readonly unknown[],
> = TAdapters extends readonly [infer First, ...infer Rest]
  ? FindAnyCaptiveDependency<
      TMap,
      LifetimeLevel<AdapterLifetimeForMap<First>>,
      AdapterRequiresNamesForLifetime<First>
    > extends infer CaptivePort
    ? IsNever<CaptivePort> extends true
      ? WouldAnyBeCaptive<
          AddLifetime<TMap, AdapterProvidesNameForLifetime<First>, AdapterLifetimeForMap<First>>,
          Rest
        >
      : CaptivePort extends string
        ? CaptiveDependencyError<
            AdapterProvidesNameForLifetime<First>,
            LifetimeName<LifetimeLevel<AdapterLifetimeForMap<First>>>,
            CaptivePort,
            LifetimeName<GetLifetimeLevel<TMap, CaptivePort>>
          >
        : false
    : false
  : false;

/**
 * Extracts the requires port names from an adapter for lifetime map operations.
 * @internal
 */
type AdapterRequiresNamesForLifetime<A> = A extends { requires: readonly (infer R)[] }
  ? R extends { __name: infer Name }
    ? Name extends string
      ? Name
      : never
    : never
  : never;

// =============================================================================
// Merged Graph Captive Dependency Detection
// =============================================================================

/**
 * Helper to get direct dependencies from a dependency map.
 * @internal
 */
type GetDirectDepsForCaptive<TMap, TPort extends string> =
  TMap extends Record<TPort, infer Deps> ? Deps : never;

/**
 * Helper to iterate over each key and check for captive dependencies.
 * Uses distributive conditional to check each key individually.
 * @internal
 */
type CheckEachKeyForCaptive<TDepGraph, TLifetimeMap, TKey extends string> = TKey extends string
  ? CheckPortForCaptive<TDepGraph, TLifetimeMap, TKey>
  : never;

/**
 * Detects captive dependencies in a merged graph.
 *
 * When two graphs are merged, captive dependencies can form that didn't exist
 * in either graph individually. For example:
 * - Graph A: Singleton A (no deps)
 * - Graph B: Singleton B depends on Scoped C
 * - If graph A depends on B later (through merge composition), captive deps
 *   might emerge that weren't validated.
 *
 * This type iterates through all ports in the merged graph and checks for
 * captive dependencies using the merged lifetime map and dependency graph.
 *
 * @typeParam TDepGraph - The merged dependency map
 * @typeParam TLifetimeMap - The merged lifetime map
 *
 * @returns CaptiveDependencyError if a captive dep exists, or never if none
 */
export type DetectCaptiveInMergedGraph<TDepGraph, TLifetimeMap> = CheckEachKeyForCaptive<
  TDepGraph,
  TLifetimeMap,
  Extract<keyof TLifetimeMap, string>
>;

/**
 * Checks if a specific port has a captive dependency in the merged graph.
 *
 * @typeParam TDepGraph - The merged dependency map
 * @typeParam TLifetimeMap - The merged lifetime map
 * @typeParam TPort - The port name to check
 *
 * @returns CaptiveDependencyError if this port has a captive dep, or never otherwise
 * @internal
 */
type CheckPortForCaptive<TDepGraph, TLifetimeMap, TPort extends string> =
  GetLifetimeLevel<TLifetimeMap, TPort> extends infer Level
    ? Level extends number
      ? GetDirectDepsForCaptive<TDepGraph, TPort> extends infer Deps
        ? IsNever<Deps> extends true
          ? never // No dependencies, no captive possible
          : Deps extends string
            ? FindAnyCaptiveDependency<TLifetimeMap, Level, Deps> extends infer Captive
              ? IsNever<Captive> extends true
                ? never
                : Captive extends string
                  ? CaptiveDependencyError<
                      TPort,
                      LifetimeName<Level>,
                      Captive,
                      LifetimeName<GetLifetimeLevel<TLifetimeMap, Captive>>
                    >
                  : never
              : never
            : never
        : never
      : never
    : never;

/**
 * Extracts the first captive error from a union of errors.
 * Used to consolidate multiple potential captive errors into one.
 * @internal
 */
export type FirstCaptiveError<T> = [T] extends [never]
  ? never
  : T extends CaptiveDependencyError<infer DN, infer DL, infer CP, infer CL>
    ? CaptiveDependencyError<DN, DL, CP, CL>
    : never;

// =============================================================================
// Lifetime Inconsistency Detection for Merge
// =============================================================================

/**
 * Helper to check each key for lifetime inconsistency.
 * Uses distributive conditional to check each key individually.
 * @internal
 */
type CheckEachKeyForInconsistency<TMapA, TMapB, TKey extends string> = TKey extends string
  ? GetLifetimeLevel<TMapA, TKey> extends infer LevelA
    ? GetLifetimeLevel<TMapB, TKey> extends infer LevelB
      ? IsNever<LevelA> extends true
        ? never // Port not in Map A
        : IsNever<LevelB> extends true
          ? never // Port not in Map B
          : LevelA extends LevelB
            ? never // Same lifetime, no inconsistency
            : TKey // Different lifetimes, return port name
      : never
    : never
  : never;

/**
 * Finds ports that exist in both lifetime maps with different lifetime levels.
 *
 * This detects when the same port is provided with different lifetimes
 * across two graphs being merged (e.g., singleton in Graph A, scoped in Graph B).
 *
 * @typeParam TMapA - First lifetime map
 * @typeParam TMapB - Second lifetime map
 *
 * @returns The first inconsistent port name, or never if all consistent
 */
export type FindLifetimeInconsistency<TMapA, TMapB> = CheckEachKeyForInconsistency<
  TMapA,
  TMapB,
  Extract<keyof TMapA & keyof TMapB, string>
>;

/**
 * Gets lifetime information for both maps for error reporting.
 * @internal
 */
export type GetInconsistentLifetimes<TMapA, TMapB, TPort extends string> = {
  levelA: GetLifetimeLevel<TMapA, TPort>;
  levelB: GetLifetimeLevel<TMapB, TPort>;
};
