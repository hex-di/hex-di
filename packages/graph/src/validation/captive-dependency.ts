/**
 * Compile-Time Captive Dependency Prevention for @hex-di/graph.
 *
 * Captive dependency is a DI anti-pattern where a longer-lived service
 * (e.g., singleton) depends on a shorter-lived service (e.g., scoped/transient).
 * This causes the shorter-lived service to be "captured" and held beyond
 * its intended lifetime, leading to stale data and memory leaks.
 *
 * These types provide compile-time validation to prevent captive dependencies
 * with zero runtime cost. All validation is performed at the type level.
 *
 * Lifetime hierarchy (lower level = longer lived):
 * - Singleton (1): lives for entire application lifetime
 * - Scoped (2): lives for duration of a scope
 * - Transient (3): created fresh for each resolution
 *
 * Rule: An adapter can only depend on adapters with the same or LOWER
 * (longer-lived) lifetime level. Depending on HIGHER (shorter-lived)
 * adapters creates a captive dependency.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "../adapter/types.js";

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

/**
 * Checks if a type is never.
 * Uses the fact that [T] extends [never] is true only when T is never.
 */
type IsNever<T> = [T] extends [never] ? true : false;

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
 * @internal
 */
type IsGreaterThan<A extends number, B extends number> = A extends 1
  ? false // 1 is never greater than anything (lowest)
  : A extends 2
    ? B extends 1
      ? true // 2 > 1
      : false // 2 <= 2, 2 <= 3
    : A extends 3
      ? B extends 1 | 2
        ? true // 3 > 1, 3 > 2
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
      ? never // Port not in map yet (forward reference) - no error
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
