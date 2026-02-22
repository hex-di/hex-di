/**
 * Captive Dependency Prevention Types for @hex-di/runtime.
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
 * - Request (2): lives for duration of an HTTP request (same level as scoped)
 * - Transient (3): created fresh for each resolution
 *
 * Note: Scoped and Request share the same level because they represent
 * equivalent lifetime semantics - both are bounded to a context that
 * eventually ends.
 *
 * Rule: An adapter can only depend on adapters with the same or LOWER
 * (longer-lived) lifetime level. Depending on HIGHER (shorter-lived)
 * adapters creates a captive dependency.
 *
 * Note: Core captive dependency detection is now integrated into GraphBuilder
 * via TLifetimeMap type parameter. These types are provided for direct
 * adapter-to-adapter validation use cases.
 *
 * @packageDocumentation
 */

import type { Port, InferPortName } from "@hex-di/core";
import type { Adapter, Lifetime, InferAdapterProvides, InferAdapterLifetime } from "@hex-di/core";

// Re-export core types from @hex-di/graph for convenience
export type {
  LifetimeLevel,
  IsCaptiveDependency,
  CaptiveDependencyError,
} from "@hex-di/graph/advanced";

// Import internal types from @hex-di/graph/advanced
export type {
  LifetimeName,
  AddLifetime,
  GetLifetimeLevel,
  FindAnyCaptiveDependency,
  MergeLifetimeMaps,
  AddManyLifetimes,
  WouldAnyBeCaptive,
} from "@hex-di/graph/advanced";

// Import LifetimeLevel for use in this module
import type { LifetimeLevel as GraphLifetimeLevel } from "@hex-di/graph/advanced";

// =============================================================================
// Type-Level Comparison Utilities (kept for backward compatibility)
// =============================================================================

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
 *
 * @internal
 */
type IsCaptive<DependentLevel extends number, DependencyLevel extends number> = IsGreaterThan<
  DependencyLevel,
  DependentLevel
>;

// =============================================================================
// Lifetime Name Extraction for Error Messages (kept for backward compatibility)
// =============================================================================

/**
 * Converts a lifetime level back to its string name for error messages.
 *
 * @typeParam Level - The numeric lifetime level (1, 2, or 3)
 *
 * @returns The lifetime name as a string literal
 *
 * @internal
 */
type LocalLifetimeName<Level extends number> = Level extends 1
  ? "Singleton"
  : Level extends 2
    ? "Scoped"
    : Level extends 3
      ? "Transient"
      : "Unknown";

// =============================================================================
// CaptiveDependencyError Type (adapter-based version)
// =============================================================================

/**
 * @internal
 * Legacy error type used by ValidateCaptiveDependency.
 * Not exported from public API - use CaptiveDependencyError from @hex-di/graph instead.
 */
type CaptiveDependencyErrorLegacy<TMessage extends string> = {
  readonly __errorBrand: "CaptiveDependencyError";
  readonly __message: TMessage;
};

// =============================================================================
// ValidateCaptiveDependency Type (adapter-based validation)
// =============================================================================

/**
 * Validates that an adapter does not have a captive dependency on another adapter.
 *
 * This type performs compile-time validation by comparing the lifetime levels
 * of the dependent adapter (TAdapter) and its required adapter (TRequiredAdapter).
 *
 * **Valid scenarios (returns TAdapter):**
 * - Singleton depending on Singleton (level 1 <= 1)
 * - Scoped depending on Singleton (level 2 > 1, dependency has lower level - OK)
 * - Scoped depending on Scoped (level 2 <= 2)
 * - Transient depending on anything (level 3 >= all, dependency has lower/equal level - OK)
 *
 * **Invalid scenarios (returns CaptiveDependencyErrorLegacy):**
 * - Singleton depending on Scoped (level 1 < 2, dependency has higher level - CAPTIVE!)
 * - Singleton depending on Transient (level 1 < 3, dependency has higher level - CAPTIVE!)
 * - Scoped depending on Transient (level 2 < 3, dependency has higher level - CAPTIVE!)
 *
 * @typeParam TAdapter - The adapter type that has the dependency
 * @typeParam TRequiredAdapter - The adapter type being depended upon
 *
 * @returns
 * - `TAdapter` if the dependency is valid (no captive dependency)
 * - `CaptiveDependencyErrorLegacy<...>` if the dependency creates a captive dependency
 *
 * @remarks
 * - All validation is performed at compile-time with zero runtime cost
 * - Error messages include the adapter names and their lifetime scopes
 * - This type is useful for direct adapter-to-adapter validation
 * - For graph-level validation, use GraphBuilder which automatically checks captive dependencies
 *
 * @see {@link GraphLifetimeLevel} - Maps lifetime strings to numeric levels
 * @see {@link CaptiveDependencyErrorLegacy} - The error type returned on violation
 *
 * @example Valid dependency - singleton on singleton
 * ```typescript
 * type Result = ValidateCaptiveDependency<
 *   typeof UserServiceSingletonAdapter, // singleton
 *   typeof LoggerSingletonAdapter        // singleton
 * >;
 * // Result = typeof UserServiceSingletonAdapter (valid)
 * ```
 *
 * @example Invalid captive dependency - singleton on scoped
 * ```typescript
 * type Result = ValidateCaptiveDependency<
 *   typeof UserServiceSingletonAdapter, // singleton
 *   typeof DatabaseScopedAdapter         // scoped
 * >;
 * // Result = CaptiveDependencyErrorLegacy<"Singleton 'UserService' cannot depend on Scoped 'Database'">
 * ```
 */
export type ValidateCaptiveDependency<
  TAdapter extends Adapter<Port<string, unknown>, Port<string, unknown> | never, Lifetime>,
  TRequiredAdapter extends Adapter<Port<string, unknown>, Port<string, unknown> | never, Lifetime>,
> =
  IsCaptive<
    GraphLifetimeLevel<InferAdapterLifetime<TAdapter>>,
    GraphLifetimeLevel<InferAdapterLifetime<TRequiredAdapter>>
  > extends true
    ? CaptiveDependencyErrorLegacy<`${LocalLifetimeName<GraphLifetimeLevel<InferAdapterLifetime<TAdapter>>>} '${InferPortName<InferAdapterProvides<TAdapter>>}' cannot depend on ${LocalLifetimeName<GraphLifetimeLevel<InferAdapterLifetime<TRequiredAdapter>>>} '${InferPortName<InferAdapterProvides<TRequiredAdapter>>}'`>
    : TAdapter;

// =============================================================================
// Batch Validation Type (adapter-based)
// =============================================================================

/**
 * Validates all dependencies of an adapter against captive dependency rules.
 *
 * This type is designed to be used when an adapter has multiple dependencies.
 * It returns the adapter if ALL dependencies are valid, or the first
 * CaptiveDependencyErrorLegacy encountered.
 *
 * @typeParam TAdapter - The adapter type to validate
 * @typeParam TAdapters - A union or tuple of all adapters that provide the dependencies
 *
 * @returns
 * - `TAdapter` if all dependencies are valid
 * - `CaptiveDependencyErrorLegacy<...>` if any dependency creates a captive dependency
 *
 * @remarks
 * This type is useful for direct adapter-to-adapter validation.
 * For graph-level validation, use GraphBuilder which automatically checks captive dependencies.
 *
 * @see {@link ValidateCaptiveDependency} - Single dependency validation
 */
export type ValidateAllDependencies<
  TAdapter extends Adapter<Port<string, unknown>, Port<string, unknown> | never, Lifetime>,
  TAdapters extends readonly Adapter<
    Port<string, unknown>,
    Port<string, unknown> | never,
    Lifetime
  >[],
> = TAdapters extends readonly [
  infer First extends Adapter<Port<string, unknown>, Port<string, unknown> | never, Lifetime>,
  ...infer Rest extends readonly Adapter<
    Port<string, unknown>,
    Port<string, unknown> | never,
    Lifetime
  >[],
]
  ? ValidateCaptiveDependency<TAdapter, First> extends TAdapter
    ? ValidateAllDependencies<TAdapter, Rest>
    : ValidateCaptiveDependency<TAdapter, First>
  : TAdapter;
