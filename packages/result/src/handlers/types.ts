/**
 * Effect handler types for composable error handling.
 *
 * An EffectHandler processes errors of a specific type (identified by tags)
 * and produces recovery values. Handlers compose algebraically via
 * {@link composeHandlers} and apply to Results via {@link transformEffects}.
 *
 * @packageDocumentation
 */

import type { Result } from "../core/types.js";

/**
 * A handler that processes errors of type `TIn` and produces recovery values of type `TOut`.
 *
 * Each handler declares which `_tag` values it can process via the `tags` array.
 * The `handle` function receives a matched error and must return `Result<TOut, never>`,
 * guaranteeing the error is fully eliminated.
 *
 * The `in` / `out` variance annotations ensure correct subtyping:
 * - `TIn` is contravariant (consumed by `handle`)
 * - `TOut` is covariant (produced by `handle`)
 *
 * @typeParam TIn  - The error type this handler accepts.
 * @typeParam TOut - The recovery value type this handler produces.
 */
export interface EffectHandler<in TIn, out TOut> {
  readonly _tag: string;
  readonly tags: ReadonlyArray<string>;
  readonly handle: (error: TIn) => Result<TOut, never>;
}

/**
 * Variance-correct lower bound for EffectHandler.
 * `never` in contravariant position and `unknown` in covariant position
 * ensures every concrete handler extends this bound.
 */
type HandlerBound = EffectHandler<never, unknown>;

/**
 * Extracts the input (error) type of an {@link EffectHandler}.
 */
export type InputOf<H extends HandlerBound> =
  H extends EffectHandler<infer I, infer _O> ? I : never;

/**
 * Extracts the output (recovery value) type of an {@link EffectHandler}.
 */
export type OutputOf<H extends HandlerBound> =
  H extends EffectHandler<infer _I, infer O> ? O : never;

/**
 * The composed handler type: handles the union of both handlers' inputs
 * and produces the union of both handlers' outputs.
 */
export type ComposeHandlers<H1 extends HandlerBound, H2 extends HandlerBound> = EffectHandler<
  InputOf<H1> | InputOf<H2>,
  OutputOf<H1> | OutputOf<H2>
>;

/**
 * Union of output types from a tuple of handlers.
 */
export type UnionOfOutputs<Handlers extends ReadonlyArray<HandlerBound>> =
  Handlers[number] extends EffectHandler<infer _I, infer O> ? O : never;

/**
 * Removes from error union `E` any members whose `_tag` appears in `Tags`.
 *
 * @typeParam E    - The original error union type.
 * @typeParam Tags - String literal union of tags to remove.
 */
export type NarrowedError<E, Tags extends string> = E extends { readonly _tag: Tags } ? never : E;
