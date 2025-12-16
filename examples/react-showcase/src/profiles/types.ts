/**
 * Adapter profile types for configuration-driven implementation selection.
 *
 * @packageDocumentation
 */

// =============================================================================
// Adapter Variant Types
// =============================================================================

/**
 * Supported adapter variants for each configurable port.
 *
 * Each key represents a port that has multiple implementations,
 * and the value is a union of valid variant names.
 */
export interface AdapterVariants {
  /** Logger implementation: console output or silent (for tests) */
  logger: "console" | "silent";

  /** Message store implementation: localStorage persistence or in-memory */
  messageStore: "localStorage" | "memory";

  /** User session implementation: module state tracking */
  userSession: "moduleState";
}

/**
 * Default variants for each adapter.
 * Used when no profile or override is specified.
 */
export const DEFAULT_VARIANTS: AdapterVariants = {
  logger: "console",
  messageStore: "localStorage",
  userSession: "moduleState",
};

// =============================================================================
// Profile Types
// =============================================================================

/**
 * Configuration profile for selecting adapter variants.
 *
 * Profiles bundle together variant selections for different environments
 * (development, test, production, etc.)
 *
 * @example
 * ```typescript
 * const testProfile: AdapterProfile = {
 *   name: "test",
 *   description: "Fast, isolated testing",
 *   variants: {
 *     logger: "silent",
 *     messageStore: "memory",
 *   },
 * };
 * ```
 */
export interface AdapterProfile {
  /** Unique name for the profile */
  readonly name: string;

  /** Human-readable description */
  readonly description?: string;

  /** Variant selections (partial - unspecified use defaults) */
  readonly variants: Partial<AdapterVariants>;
}
