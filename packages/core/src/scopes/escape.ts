/**
 * Scope Escape Detection — Type-Level Leak Prevention
 *
 * Provides compile-time detection of scoped references escaping their scope.
 * Functions that accept scoped references must declare the expected scope identity.
 * The `AssertNoEscape` conditional type prevents returning scoped refs from scope
 * callbacks — a compile-time analog of Rust's borrow checker.
 *
 * Implements: BEH-CO-09-002
 *
 * @packageDocumentation
 */

import type { ScopedRef, ScopedContainer, ScopeBrandSymbol } from "./types.js";

// =============================================================================
// ScopeBound
// =============================================================================

/**
 * A function signature bound to a specific scope identity.
 *
 * Methods that accept scoped references must declare the expected scope,
 * preventing cross-scope reference passing at compile time.
 *
 * @typeParam TScopeId - The scope identity this function is bound to
 */
export type ScopeBound<TScopeId extends string> = {
  processInScope<T>(ref: ScopedRef<T, TScopeId>): void;
};

// =============================================================================
// ContainsScopedRef (Recursive Detection)
// =============================================================================

/**
 * Recursively checks if a type contains a `ScopedRef` with the given scope identity.
 *
 * Detection is bounded to avoid TypeScript recursion limits: the depth parameter
 * decrements on each recursive step, stopping at 0.
 *
 * @typeParam T - The type to check
 * @typeParam TScopeId - The scope identity to detect
 * @typeParam TDepth - Recursion depth counter (defaults to [1,1,1,1,1] for 5 levels)
 */
export type ContainsScopedRef<
  T,
  TScopeId extends string,
  TDepth extends ReadonlyArray<unknown> = [1, 1, 1, 1, 1],
> =
  // Base case: recursion depth exhausted
  TDepth extends readonly []
    ? false
    : // Direct ScopedRef match
      T extends { readonly [K in ScopeBrandSymbol]: TScopeId }
      ? true
      : // Promise<ScopedRef<...>>
        T extends Promise<infer TInner>
        ? TDepth extends readonly [unknown, ...infer TRest]
          ? ContainsScopedRef<TInner, TScopeId, TRest>
          : false
        : // Array<ScopedRef<...>>
          T extends ReadonlyArray<infer TItem>
          ? TDepth extends readonly [unknown, ...infer TRest]
            ? ContainsScopedRef<TItem, TScopeId, TRest>
            : false
          : // Object with scoped ref properties
            T extends Record<string, unknown>
            ? TDepth extends readonly [unknown, ...infer TRest]
              ? ContainsScopedRefInObject<T, TScopeId, TRest>
              : false
            : false;

/**
 * Checks object properties for scoped references.
 * @internal
 */
type ContainsScopedRefInObject<
  T extends Record<string, unknown>,
  TScopeId extends string,
  TDepth extends ReadonlyArray<unknown>,
> = {
  [K in keyof T]: ContainsScopedRef<T[K], TScopeId, TDepth>;
}[keyof T] extends false
  ? false
  : true;

// =============================================================================
// AssertNoEscape
// =============================================================================

/**
 * Validates that a callback return type does not contain scoped references.
 *
 * If the return type structurally matches `ScopedRef<*, TScopeId>` (directly or
 * nested), a descriptive tuple-as-error-message is returned instead, causing a
 * type error at the call site.
 *
 * @typeParam TResult - The callback return type to validate
 * @typeParam TScopeId - The scope identity to check for escape
 *
 * @example
 * ```ts
 * type Ok = AssertNoEscape<number, "req-1">;
 * // => number (no escape)
 *
 * type Escaped = AssertNoEscape<ScopedRef<Logger, "req-1">, "req-1">;
 * // => ["ERROR: Scoped reference cannot escape its scope", "req-1"]
 * ```
 */
export type AssertNoEscape<TResult, TScopeId extends string> =
  ContainsScopedRef<TResult, TScopeId> extends true
    ? ["ERROR: Scoped reference cannot escape its scope", TScopeId]
    : TResult;

// =============================================================================
// ScopeCallback
// =============================================================================

/**
 * A callback that receives a scoped container and returns a result.
 *
 * The result type is validated by `AssertNoEscape` to prevent scoped references
 * from escaping the callback.
 *
 * @typeParam TProvides - The services available in the scope
 * @typeParam TScopeId - The scope identity
 * @typeParam TResult - The callback return type
 */
export type ScopeCallback<TProvides, TScopeId extends string, TResult> = (
  scope: ScopedContainer<TProvides, TScopeId>
) => AssertNoEscape<TResult, TScopeId>;

// =============================================================================
// withScope (type signature)
// =============================================================================

/**
 * Type signature for the `withScope` function.
 *
 * Executes a callback within a scope, ensuring scoped references cannot escape.
 * The callback receives a `ScopedContainer` and its return type is validated
 * at compile time via `AssertNoEscape`.
 *
 * @typeParam TProvides - The services available in the scope
 * @typeParam TScopeId - The scope identity
 * @typeParam TResult - The callback return type (must not contain scoped refs)
 */
export type WithScopeFn = <TProvides, TScopeId extends string, TResult>(
  container: ScopedContainer<TProvides, TScopeId>,
  callback: (scope: ScopedContainer<TProvides, TScopeId>) => AssertNoEscape<TResult, TScopeId>
) => AssertNoEscape<TResult, TScopeId>;
