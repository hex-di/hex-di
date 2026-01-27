/**
 * Lifetime Level Types for Captive Dependency Detection.
 *
 * This module provides types for mapping between:
 * - Lifetime strings ("singleton", "scoped", "transient")
 * - Numeric levels (1, 2, 3) for type-level comparison
 * - Display names ("Singleton", "Scoped", "Transient") for error messages
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
 * ## Error Handling
 *
 * `LifetimeLevel` and `LifetimeName` return `never` for invalid inputs, which
 * propagates through the type system and is caught by `IsNever<T>` checks.
 *
 * For better diagnostics, use `DiagnosticLifetimeLevel` and `DiagnosticLifetimeName`
 * which return `InferenceError` for invalid inputs, providing clear error messages
 * in IDE tooltips.
 *
 * @packageDocumentation
 */

import type { SINGLETON_LEVEL, SCOPED_LEVEL, TRANSIENT_LEVEL } from "./lifetime-constants.js";
import type { InferenceError } from "../../../types/type-utilities.js";

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
 * ## Error Handling
 *
 * | Input | Output | Reason |
 * |-------|--------|--------|
 * | `"singleton"` | `1` | Valid lifetime |
 * | `"scoped"` | `2` | Valid lifetime |
 * | `"transient"` | `3` | Valid lifetime |
 * | `never` | `never` | Preserves empty union semantics |
 * | Other | `never` | Invalid lifetime (use `DiagnosticLifetimeLevel` for error details) |
 *
 * @typeParam TLifetime - The Lifetime literal type ('singleton' | 'scoped' | 'transient')
 *
 * @returns The numeric level (1, 2, or 3), or `never` for invalid/`never` input
 *
 * @example
 * ```typescript
 * type SingletonLevel = LifetimeLevel<'singleton'>; // 1
 * type ScopedLevel = LifetimeLevel<'scoped'>;       // 2
 * type TransientLevel = LifetimeLevel<'transient'>; // 3
 * type Invalid = LifetimeLevel<'invalid'>;          // never
 * ```
 *
 * @internal
 */
export type LifetimeLevel<TLifetime> = TLifetime extends "singleton"
  ? SINGLETON_LEVEL
  : TLifetime extends "scoped"
    ? SCOPED_LEVEL
    : TLifetime extends "transient"
      ? TRANSIENT_LEVEL
      : never;

/**
 * Converts a lifetime level back to its string name for error messages.
 *
 * ## Error Handling
 *
 * | Input | Output | Reason |
 * |-------|--------|--------|
 * | `1` | `"Singleton"` | Valid singleton level |
 * | `2` | `"Scoped"` | Valid scoped level |
 * | `3` | `"Transient"` | Valid transient level |
 * | `never` | `never` | Preserves empty union semantics |
 * | Other | `never` | Invalid level (use `DiagnosticLifetimeName` for error details) |
 *
 * @typeParam Level - The numeric lifetime level (1, 2, or 3)
 *
 * @returns The lifetime name, or `never` for invalid/`never` input
 */
export type LifetimeName<Level> = Level extends SINGLETON_LEVEL
  ? "Singleton"
  : Level extends SCOPED_LEVEL
    ? "Scoped"
    : Level extends TRANSIENT_LEVEL
      ? "Transient"
      : never;

// =============================================================================
// Diagnostic Variants (with InferenceError for better IDE tooltips)
// =============================================================================

/**
 * Diagnostic version of `LifetimeLevel` that returns `InferenceError` for invalid inputs.
 *
 * Use this type when you want to see detailed error information in IDE tooltips
 * rather than just `never`. The standard `LifetimeLevel` returns `never` for
 * invalid inputs, which is correct for type propagation but provides no diagnostics.
 *
 * ## When to Use
 *
 * - **Internal type constraints**: Use `LifetimeLevel<T>` (returns `never` for invalid)
 * - **User-facing diagnostics**: Use `DiagnosticLifetimeLevel<T>` (returns `InferenceError`)
 * - **Debug types**: Use `DiagnosticLifetimeLevel<T>` for visibility in IDE tooltips
 *
 * @typeParam TLifetime - The Lifetime literal type to convert
 *
 * @returns The numeric level, `never` for `never` input, or `InferenceError` for invalid input
 *
 * @example Debugging invalid lifetime
 * ```typescript
 * // Hover over 'Debug' in IDE to see the error:
 * // InferenceError<"LifetimeLevel", "Invalid lifetime...", "invalid">
 * type Debug = DiagnosticLifetimeLevel<"invalid">;
 *
 * // Compare to standard LifetimeLevel which just shows: never
 * type Standard = LifetimeLevel<"invalid">;
 * ```
 *
 * @internal
 */
export type DiagnosticLifetimeLevel<TLifetime> =
  // Preserve `never` for empty union semantics (e.g., TRequires = never)
  [TLifetime] extends [never]
    ? never
    : TLifetime extends "singleton"
      ? SINGLETON_LEVEL
      : TLifetime extends "scoped"
        ? SCOPED_LEVEL
        : TLifetime extends "transient"
          ? TRANSIENT_LEVEL
          : InferenceError<
              "LifetimeLevel",
              "Invalid lifetime. Expected 'singleton', 'scoped', or 'transient'.",
              TLifetime
            >;

/**
 * Diagnostic version of `LifetimeName` that returns `InferenceError` for invalid inputs.
 *
 * Use this type when you want to see detailed error information in IDE tooltips
 * rather than just `never`. The standard `LifetimeName` returns `never` for
 * invalid inputs, which is correct for type propagation but provides no diagnostics.
 *
 * ## When to Use
 *
 * - **Internal type constraints**: Use `LifetimeName<T>` (returns `never` for invalid)
 * - **User-facing diagnostics**: Use `DiagnosticLifetimeName<T>` (returns `InferenceError`)
 * - **Debug types**: Use `DiagnosticLifetimeName<T>` for visibility in IDE tooltips
 *
 * @typeParam Level - The numeric level to convert
 *
 * @returns The lifetime name, `never` for `never` input, or `InferenceError` for invalid input
 *
 * @example Debugging invalid level
 * ```typescript
 * // Hover over 'Debug' in IDE to see the error:
 * // InferenceError<"LifetimeName", "Invalid level...", 99>
 * type Debug = DiagnosticLifetimeName<99>;
 *
 * // Compare to standard LifetimeName which just shows: never
 * type Standard = LifetimeName<99>;
 * ```
 *
 * @internal
 */
export type DiagnosticLifetimeName<Level> =
  // Preserve `never` for empty union semantics
  [Level] extends [never]
    ? never
    : Level extends SINGLETON_LEVEL
      ? "Singleton"
      : Level extends SCOPED_LEVEL
        ? "Scoped"
        : Level extends TRANSIENT_LEVEL
          ? "Transient"
          : InferenceError<"LifetimeName", "Invalid level. Expected 1, 2, or 3.", Level>;
