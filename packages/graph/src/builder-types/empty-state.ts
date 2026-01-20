/**
 * Empty state types for GraphBuilder initialization.
 *
 * @packageDocumentation
 */

// =============================================================================
// Empty State Types
// =============================================================================

/**
 * Type representing an empty dependency graph map.
 * Used as the initial state for compile-time cycle detection.
 *
 * IMPORTANT: Must be `{}` not `Record<string, never>`.
 * Using `Record<string, never>` causes index signature pollution when
 * intersected with specific properties. For example:
 * `Record<string, never> & { A: "B" }` makes `["A"]` return `never & "B"` = `never`.
 */
export type EmptyDependencyGraph = {};

/**
 * Type representing an empty lifetime map.
 * Used as the initial state for compile-time captive dependency detection.
 *
 * IMPORTANT: Must be `{}` not `Record<string, never>`.
 * See EmptyDependencyGraph for explanation.
 */
export type EmptyLifetimeMap = {};

// =============================================================================
// Adapter Lifetime Extraction
// =============================================================================

/**
 * Extracts the lifetime directly from an adapter using property access.
 * This explicitly maps each literal to avoid inference issues with unions.
 * @internal
 */
export type DirectAdapterLifetime<TAdapter> = TAdapter extends { lifetime: "singleton" }
  ? "singleton"
  : TAdapter extends { lifetime: "scoped" }
    ? "scoped"
    : TAdapter extends { lifetime: "transient" }
      ? "transient"
      : "singleton";
