/**
 * Scoped Reference Tracking — Branded Types
 *
 * Defines `ScopedRef<T, TScopeId>`, a branded type that encodes scope identity
 * on resolved references. References from different scopes are type-incompatible,
 * preventing cross-scope leaks at compile time.
 *
 * The brand is intersection-based (`T & { [brand]: ScopeId }`), so `ScopedRef<T, S>`
 * is still assignable to `T` in contexts that do not require scope tracking,
 * enabling gradual adoption.
 *
 * Inspired by Rust's lifetime parameters (Weiss et al., 2019 — Oxide).
 * `TScopeId` functions as a lifetime parameter encoding reference provenance.
 *
 * Implements: BEH-CO-09-001
 *
 * @packageDocumentation
 */

import type { Port } from "../ports/types.js";
import type { ContainerPhase } from "../inspection/container-types.js";

// =============================================================================
// Scope Brand Symbol
// =============================================================================

/**
 * Unique symbol used for phantom branding of scope identity on resolved references.
 *
 * This is a phantom brand — it exists only at the type level with no
 * runtime representation. The `declare const` ensures TypeScript treats it
 * as a unique symbol type without generating any JavaScript code.
 */
declare const __scopeBrand: unique symbol;

/** The phantom brand symbol type, exported for use in type constraints. */
export type ScopeBrandSymbol = typeof __scopeBrand;

// =============================================================================
// ScopedRef
// =============================================================================

/**
 * A branded type that encodes both the service interface and the scope identity.
 *
 * References from different scopes are type-incompatible due to the unique symbol brand.
 * TypeScript's structural typing is bypassed by the unique symbol, preventing
 * cross-scope assignment.
 *
 * At runtime, the brand has no overhead — it is a phantom type erased at compilation.
 *
 * @typeParam T - The service type
 * @typeParam TScopeId - The scope identity (literal string type)
 *
 * @example
 * ```ts
 * type RefA = ScopedRef<Logger, "req-1">;
 * type RefB = ScopedRef<Logger, "req-2">;
 * // RefA is NOT assignable to RefB (different scope identity)
 * // Both RefA and RefB ARE assignable to Logger (gradual adoption)
 * ```
 */
export type ScopedRef<T, TScopeId extends string> = T & {
  readonly [__scopeBrand]: TScopeId;
};

// =============================================================================
// IsScopedRef
// =============================================================================

/**
 * Type-level predicate that checks if a type is a `ScopedRef`.
 *
 * @typeParam T - The type to check
 */
export type IsScopedRef<T> = T extends { readonly [K in ScopeBrandSymbol]: string } ? true : false;

// =============================================================================
// ExtractScopeId
// =============================================================================

/**
 * Extracts the scope identity from a `ScopedRef`, or `never` if not a scoped ref.
 *
 * @typeParam T - The type to extract from
 */
export type ExtractScopeId<T> = T extends ScopedRef<infer _S, infer TScopeId> ? TScopeId : never;

// =============================================================================
// ExtractService
// =============================================================================

/**
 * Extracts the underlying service type from a `ScopedRef`, stripping the scope brand.
 *
 * @typeParam T - The scoped ref type
 */
export type ExtractService<T> = T extends ScopedRef<infer S, infer _TScopeId> ? S : T;

// =============================================================================
// ScopedContainer
// =============================================================================

/**
 * A scope-aware container that brands resolved services with the scope identity.
 *
 * When `TPhase` is `"active"`, the `resolve` method returns `ScopedRef<T, TScopeId>`.
 * In any other phase, `resolve` is `never` (uncallable).
 *
 * @typeParam TProvides - Record mapping port names to service types
 * @typeParam TScopeId - The scope identity (literal string type)
 * @typeParam TPhase - The container phase (defaults to `"active"`)
 *
 * @example
 * ```ts
 * const scopeA: ScopedContainer<{ Logger: Logger }, "req-1">;
 * const logger = scopeA.resolve(LoggerPort);
 * // Type: ScopedRef<Logger, "req-1">
 * ```
 */
export interface ScopedContainer<
  TProvides,
  TScopeId extends string,
  TPhase extends ContainerPhase = "active",
> {
  /**
   * Resolves a service from this scope, branded with the scope identity.
   *
   * Only available when the scope is in the `"active"` phase.
   */
  readonly resolve: TPhase extends "active"
    ? <N extends keyof TProvides>(
        port: Port<N & string, TProvides[N]>
      ) => ScopedRef<TProvides[N], TScopeId>
    : never;

  /** The scope identity string, available at runtime for debugging. */
  readonly scopeId: TScopeId;
}
