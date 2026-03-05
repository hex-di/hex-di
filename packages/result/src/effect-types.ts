/**
 * Effect polymorphism type utilities for working with effects (error types) in Result<T, E>.
 *
 * These enable generic programming over effectful computations.
 * ALL PURE TYPES -- zero runtime cost.
 *
 * @packageDocumentation
 */

import type { Result } from "./core/types.js";
import type { ResultAsync } from "./core/types.js";

/** Extract the effect (error) type from a Result or ResultAsync. Returns never for non-Result types. */
export type EffectOf<T> =
  T extends Result<unknown, infer E> ? E : T extends ResultAsync<unknown, infer E> ? E : never;

/** A Result with no effects -- guaranteed success. */
export type PureResult<T> = Result<T, never>;

/** A Result that has effects. Returns never for pure results (where E is never). */
export type EffectfulResult<T, E> = [E] extends [never] ? never : Result<T, E>;

/** Remove specific effects without handling (type-level only, unsafe). */
export type MaskEffects<R extends Result<unknown, unknown>, Mask> =
  R extends Result<infer T, infer E> ? Result<T, Exclude<E, Mask>> : never;

/** Add an effect to a Result's error type. */
export type LiftEffect<R extends Result<unknown, unknown>, NewEffect> =
  R extends Result<infer T, infer E> ? Result<T, E | NewEffect> : never;

/** Check whether a Result type has no effects (is pure). */
export type IsEffectFree<R extends Result<unknown, unknown>> =
  R extends Result<unknown, infer E> ? ([E] extends [never] ? true : false) : false;

/** Compute the union of all effects from a tuple of Result types. */
export type EffectUnion<Rs extends ReadonlyArray<Result<unknown, unknown>>> = {
  [I in keyof Rs]: Rs[I] extends Result<unknown, infer E> ? E : never;
}[number];
