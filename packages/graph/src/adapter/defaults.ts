/**
 * Type-Safe Default Value Helpers
 *
 * This module provides helper functions for handling optional configuration
 * values with compile-time type safety using function overloads.
 *
 * ## Design Pattern: Overload-Based Type Preservation
 *
 * TypeScript cannot narrow generic types through nullish coalescing
 * (see https://github.com/microsoft/TypeScript/issues/41361). We solve
 * this by using explicit function overloads on the calling functions
 * (createAdapter, createAsyncAdapter, defineService) rather than on
 * these helpers.
 *
 * These helpers exist to provide a single source of truth for default
 * values and to document the pattern.
 *
 * @internal
 * @packageDocumentation
 */

// =============================================================================
// Literal Helper
// =============================================================================

/**
 * Helper function that returns a value with its literal type preserved.
 * TypeScript infers the const type parameter from the argument.
 * @internal
 */
function literal<const T>(value: T): T {
  return value;
}

// =============================================================================
// Default Value Constants
// =============================================================================

/**
 * Default value for the clonable option.
 * Services are not clonable by default for safety.
 * @internal
 */
export const DEFAULT_CLONABLE = false;

/**
 * Default value for the lifetime option.
 * Singleton is the most common use case.
 * Uses literal() helper to preserve "singleton" literal type without `as const`.
 * @internal
 */
export const DEFAULT_LIFETIME = literal("singleton");

/**
 * Default value for the requires option.
 * Empty tuple for adapters with no dependencies.
 * Uses literal() and Object.freeze() to preserve readonly [] type.
 * @internal
 */
export const DEFAULT_REQUIRES = Object.freeze(literal([]));

// =============================================================================
// Runtime Default Helpers
// =============================================================================

/**
 * Returns the clonable value with a default of `false`.
 *
 * @param value - The optional clonable value from config
 * @returns The value if defined, otherwise `false`
 *
 * @internal
 */
export function defaultClonable(value: boolean | undefined): boolean {
  return value ?? DEFAULT_CLONABLE;
}

/**
 * Returns the lifetime value with a default of `"singleton"`.
 *
 * @param value - The optional lifetime value from config
 * @returns The value if defined, otherwise `"singleton"`
 *
 * @internal
 */
export function defaultLifetime(
  value: "singleton" | "scoped" | "transient" | undefined
): "singleton" | "scoped" | "transient" {
  return value ?? DEFAULT_LIFETIME;
}

// =============================================================================
// Tuple Freeze Helper
// =============================================================================

/**
 * Freezes a tuple while preserving its exact type.
 *
 * @param tuple - A readonly tuple to freeze
 * @returns The frozen tuple
 *
 * @internal
 */
export function freezeTuple<const T extends readonly [unknown, unknown]>(tuple: T): Readonly<T> {
  return Object.freeze(tuple);
}
