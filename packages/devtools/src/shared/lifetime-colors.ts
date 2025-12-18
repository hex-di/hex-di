/**
 * Type-safe lifetime color mapping.
 *
 * This module provides a type-safe mapping from service lifetime to semantic color.
 * Using a const object with satisfies ensures TypeScript preserves the literal types.
 *
 * @packageDocumentation
 */

import type { SemanticColor } from "../ports/render-primitives.port.js";

// =============================================================================
// Lifetime Type
// =============================================================================

/**
 * Service lifetime values.
 */
export type Lifetime = "singleton" | "scoped" | "transient";

// =============================================================================
// Color Mapping
// =============================================================================

/**
 * Mapping from lifetime to semantic color.
 *
 * Uses `satisfies` to ensure type safety while preserving literal types.
 * This allows getLifetimeColor to return SemanticColor without casts.
 */
const LIFETIME_COLORS = {
  singleton: "success",
  scoped: "warning",
  transient: "muted",
} as const satisfies Record<Lifetime, SemanticColor>;

/**
 * Gets the semantic color for a service lifetime.
 *
 * @param lifetime - The service lifetime
 * @returns The corresponding semantic color
 *
 * @example
 * ```typescript
 * const color = getLifetimeColor("singleton"); // "success"
 * <Icon color={color} /> // No cast needed!
 * ```
 */
export function getLifetimeColor(lifetime: Lifetime): SemanticColor {
  return LIFETIME_COLORS[lifetime];
}

/**
 * Gets the icon name for a service lifetime.
 *
 * @param lifetime - The service lifetime
 * @returns The corresponding icon name
 */
export function getLifetimeIcon(lifetime: Lifetime): "singleton" | "scoped" | "transient" {
  return lifetime;
}

// =============================================================================
// Trend Color Mapping
// =============================================================================

/**
 * Trend direction values.
 */
export type Trend = "up" | "down" | "stable" | "none";

/**
 * Mapping from trend direction to semantic color.
 */
const TREND_COLORS = {
  up: "success",
  down: "error",
  stable: "muted",
  none: "muted",
} as const satisfies Record<Trend, SemanticColor>;

/**
 * Gets the semantic color for a trend direction.
 *
 * @param trend - The trend direction
 * @returns The corresponding semantic color
 */
export function getTrendColor(trend: Trend): SemanticColor {
  return TREND_COLORS[trend];
}
