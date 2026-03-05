/**
 * Resource Polymorphism - Phantom Type Brands
 *
 * Type-level resource tracking via phantom brands, enabling the type system
 * to distinguish between adapters that own cleanup-requiring resources
 * and those that don't.
 *
 * @packageDocumentation
 */

// =============================================================================
// Phantom Brand Symbols
// =============================================================================

/** Unique symbol for disposable phantom branding */
declare const DisposableBrand: unique symbol;

/** Unique symbol for non-disposable phantom branding */
declare const NonDisposableBrand: unique symbol;

// =============================================================================
// Core Types
// =============================================================================

/** Resource kind discriminant */
export type ResourceKind = "disposable" | "non-disposable";

/** Phantom-branded type marking a service that owns disposable resources */
export type Disposable<T> = T & { readonly [DisposableBrand]: true };

/** Phantom-branded type marking a service with no disposal obligations */
export type NonDisposable<T> = T & { readonly [NonDisposableBrand]: true };

/** Union of both resource kinds */
export type AnyResource<T> = Disposable<T> | NonDisposable<T>;

// =============================================================================
// Type-Level Queries
// =============================================================================

/** Extract the resource kind from a branded type */
export type ResourceKindOf<T> =
  T extends Disposable<unknown>
    ? "disposable"
    : T extends NonDisposable<unknown>
      ? "non-disposable"
      : "unknown";

/** Check if a type has disposal obligations */
export type IsDisposable<T> = T extends Disposable<unknown> ? true : false;

/** Check if a type is free of disposal obligations */
export type IsNonDisposable<T> = T extends NonDisposable<unknown> ? true : false;

// =============================================================================
// Inference Utilities
// =============================================================================

/**
 * Infer resource kind from adapter config shape.
 * If config has a `finalizer` function, it's disposable.
 */
export type InferResourceKind<TConfig> = TConfig extends {
  finalizer: (...args: ReadonlyArray<unknown>) => unknown;
}
  ? "disposable"
  : "non-disposable";

/**
 * Aggregate disposal obligations from a tuple of resource types.
 * If ANY resource is disposable, the aggregate is disposable.
 */
export type AggregateDisposal<Rs extends ReadonlyArray<unknown>> = true extends {
  [I in keyof Rs]: IsDisposable<Rs[I]>;
}[number]
  ? "disposable"
  : "non-disposable";

// =============================================================================
// Tracked Scope
// =============================================================================

/**
 * Type-safe scope that tracks its disposal obligations.
 * A scope containing disposable resources MUST be disposed.
 */
export interface TrackedScope<TKind extends ResourceKind> {
  readonly _resourceKind: TKind;
}
