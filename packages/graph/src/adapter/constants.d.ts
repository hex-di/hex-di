/**
 * Literal Value Constants for Adapters.
 *
 * This module provides literal-typed constants for use throughout the adapter
 * system. Using these constants instead of inline string literals ensures
 * type narrowing works correctly without requiring `as const` casts.
 *
 * ## Why This Pattern?
 *
 * TypeScript infers literal types for values returned from const functions.
 * By using `literal()`, we get values like `"sync"` (literal) instead of
 * `string` (widened). This enables:
 *
 * - Correct overload resolution in createAdapter/createAsyncAdapter
 * - Type narrowing without `as const` casts
 * - Consistent type inference across the codebase
 *
 * @packageDocumentation
 */
/**
 * Literal-typed constant for sync factory kind.
 * @internal
 */
export declare const SYNC: "sync";
/**
 * Literal-typed constant for async factory kind.
 * @internal
 */
export declare const ASYNC: "async";
/**
 * Literal-typed constant for singleton lifetime.
 * @internal
 */
export declare const SINGLETON: "singleton";
/**
 * Literal-typed constant for scoped lifetime.
 * @internal
 */
export declare const SCOPED: "scoped";
/**
 * Literal-typed constant for transient lifetime.
 * @internal
 */
export declare const TRANSIENT: "transient";
/**
 * Literal-typed constant for boolean true.
 * @internal
 */
export declare const TRUE: true;
/**
 * Literal-typed constant for boolean false.
 * @internal
 */
export declare const FALSE: false;
/**
 * Frozen empty requires array for adapters with no dependencies.
 * @internal
 */
export declare const EMPTY_REQUIRES: readonly [];
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
