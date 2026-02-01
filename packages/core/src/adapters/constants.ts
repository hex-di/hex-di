/**
 * Literal Value Constants for Adapters.
 *
 * This module provides literal-typed constants for use throughout the adapter
 * system. Using these constants instead of inline string literals ensures
 * type narrowing works correctly without requiring `as const` casts.
 *
 * @packageDocumentation
 */

/**
 * Helper function that returns a value with its literal type preserved.
 * TypeScript infers the const type parameter from the argument.
 *
 * @example
 * ```typescript
 * const x = literal("hello"); // type: "hello" (not string)
 * const y = literal(42);       // type: 42 (not number)
 * ```
 *
 * @internal
 */
function literal<const T>(value: T): T {
  return value;
}

// =============================================================================
// Factory Kind Constants
// =============================================================================

/**
 * Literal-typed constant for sync factory kind.
 */
export const SYNC = literal("sync");

/**
 * Literal-typed constant for async factory kind.
 */
export const ASYNC = literal("async");

// =============================================================================
// Lifetime Constants
// =============================================================================

/**
 * Literal-typed constant for singleton lifetime.
 */
export const SINGLETON = literal("singleton");

/**
 * Literal-typed constant for scoped lifetime.
 */
export const SCOPED = literal("scoped");

/**
 * Literal-typed constant for transient lifetime.
 */
export const TRANSIENT = literal("transient");

// =============================================================================
// Boolean Constants
// =============================================================================

/**
 * Literal-typed constant for boolean true.
 */
export const TRUE = literal(true);

/**
 * Literal-typed constant for boolean false.
 */
export const FALSE = literal(false);

// =============================================================================
// Empty Array Constant
// =============================================================================

/**
 * Frozen empty requires array for adapters with no dependencies.
 */
export const EMPTY_REQUIRES = Object.freeze(literal([]));

// =============================================================================
// Type Aliases (for cleaner overload signatures)
// =============================================================================

/** Literal type for sync factory kind */
export type Sync = typeof SYNC;

/** Literal type for async factory kind */
export type Async = typeof ASYNC;

/** Literal type for singleton lifetime */
export type Singleton = typeof SINGLETON;

/** Literal type for scoped lifetime */
export type Scoped = typeof SCOPED;

/** Literal type for transient lifetime */
export type Transient = typeof TRANSIENT;

/** Literal type for boolean false */
export type False = typeof FALSE;

/** Literal type for boolean true */
export type True = typeof TRUE;

/** Type for empty requires tuple */
export type EmptyRequires = typeof EMPTY_REQUIRES;
