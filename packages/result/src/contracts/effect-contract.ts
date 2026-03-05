/**
 * Type-level function contracts that declare effects (error types)
 * as part of the function signature.
 *
 * These are PURE TYPES with zero runtime cost. No JavaScript is emitted.
 *
 * @since v1.0.0
 * @see spec/packages/result/behaviors/18-effect-contracts.md
 */

import type { Result } from "../core/types.js";
import type { InferOk, InferErr } from "../type-utils.js";

// =============================================================================
// Tagged Error
// =============================================================================

/**
 * A tagged error base type. Combines a discriminant `_tag` with optional fields.
 *
 * When no Fields parameter is provided, produces `Readonly<{ _tag: Tag }>`.
 *
 * @typeParam Tag - The string literal tag for discrimination.
 * @typeParam Fields - Additional fields on the error object. Defaults to no extra fields.
 */
export type TaggedError<
  Tag extends string,
  Fields extends Record<string, unknown> = Record<string, unknown>,
> = Readonly<{ _tag: Tag } & Fields>;

// =============================================================================
// Effect Contract
// =============================================================================

/**
 * Type-level function contract declaring input, output, and effects.
 *
 * An effect contract specifies what a function takes as input, what it returns
 * on success, and what error types (effects) it may produce.
 *
 * @typeParam In - The input type of the function.
 * @typeParam Out - The success output type.
 * @typeParam Effects - The union of error types the function may produce.
 */
export interface EffectContract<In, Out, Effects> {
  readonly _brand: "EffectContract";
  readonly _in: In;
  readonly _out: Out;
  readonly _effects: Effects;
}

// =============================================================================
// Violation Types
// =============================================================================

/**
 * Produced when a function's error types are not a subset of the contract's declared effects.
 */
export type EffectViolation<Actual, Expected> = {
  readonly _error: "EFFECT_VIOLATION";
  readonly message: "Function produces effects not declared in contract";
  readonly unexpected: Exclude<Actual, Expected>;
  readonly declared: Expected;
};

/**
 * Produced when a function's success output type does not match the contract.
 */
export type OutputViolation<Actual, Expected> = {
  readonly _error: "OUTPUT_VIOLATION";
  readonly message: "Function output type does not match contract";
  readonly actual: Actual;
  readonly expected: Expected;
};

/**
 * Produced when a function's input type does not match the contract.
 */
export type InputViolation<Actual, Expected> = {
  readonly _error: "INPUT_VIOLATION";
  readonly message: "Function input type does not match contract";
  readonly actual: Actual;
  readonly expected: Expected;
};

/**
 * Produced when two contracts cannot be composed because the output of the first
 * is not assignable to the input of the second.
 */
export type ContractCompositionError<Out1, In2> = {
  readonly _error: "CONTRACT_COMPOSITION_ERROR";
  readonly message: "Contract output type is not assignable to next contract input type";
  readonly outputType: Out1;
  readonly requiredInputType: In2;
};

// =============================================================================
// Internal helper: any function returning a Result
// =============================================================================

/** A function that takes any arguments and returns a Result. */
type ResultReturningFn = (...args: never[]) => Result<unknown, unknown>;

// =============================================================================
// Contract Verification (BEH-18-002)
// =============================================================================

/**
 * Verify that a function satisfies an effect contract.
 *
 * Checks (in order):
 * 1. The function's parameter matches the contract's input type
 * 2. The function's Ok type matches the contract's output type
 * 3. The function's Err type is a subset of the contract's declared effects
 *
 * Returns `true` if the function satisfies the contract, or the appropriate
 * violation type with a human-readable compile-time error message.
 *
 * @typeParam Fn - The function type to verify.
 * @typeParam Contract - The effect contract to verify against.
 */
export type SatisfiesContract<
  Fn extends ResultReturningFn,
  Contract extends EffectContract<unknown, unknown, unknown>,
> =
  Parameters<Fn> extends [Contract["_in"]]
    ? InferOk<ReturnType<Fn>> extends Contract["_out"]
      ? InferErr<ReturnType<Fn>> extends Contract["_effects"]
        ? true
        : EffectViolation<InferErr<ReturnType<Fn>>, Contract["_effects"]>
      : OutputViolation<InferOk<ReturnType<Fn>>, Contract["_out"]>
    : InputViolation<Parameters<Fn>, [Contract["_in"]]>;

// =============================================================================
// Contract Composition (BEH-18-003)
// =============================================================================

/**
 * Compose two contracts sequentially. The output of the first contract must be
 * assignable to the input of the second. Effects are merged (union).
 *
 * @typeParam C1 - The first contract.
 * @typeParam C2 - The second contract (receives C1's output).
 */
export type ComposeContracts<
  C1 extends EffectContract<unknown, unknown, unknown>,
  C2 extends EffectContract<unknown, unknown, unknown>,
> = C1["_out"] extends C2["_in"]
  ? EffectContract<C1["_in"], C2["_out"], C1["_effects"] | C2["_effects"]>
  : ContractCompositionError<C1["_out"], C2["_in"]>;
