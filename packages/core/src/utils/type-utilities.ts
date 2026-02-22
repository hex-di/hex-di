/**
 * Common utility types shared across @hex-di/core.
 *
 * @packageDocumentation
 */

import type { Port } from "../ports/types.js";

/**
 * Checks if a type is `never`.
 *
 * Uses the tuple wrapping technique `[T] extends [never]` to prevent
 * conditional type distribution over `never`, which would incorrectly
 * return `never` instead of `true`.
 *
 * @typeParam T - The type to check
 * @returns `true` if T is `never`, `false` otherwise
 *
 * @example
 * ```typescript
 * type A = IsNever<never>;    // true
 * type B = IsNever<string>;   // false
 * type C = IsNever<undefined>; // false
 * ```
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Converts a tuple/array type to a union of its element types.
 *
 * @typeParam T - A tuple or array type
 * @returns Union of all element types, or `never` for empty array
 */
export type TupleToUnion<T extends readonly Port<string, unknown>[]> = T extends readonly []
  ? never
  : T[number];

/**
 * Flattens intersection types into a single object type for better readability.
 *
 * ## Purpose
 *
 * When types are intersected (`A & B`), TypeScript displays them as `A & B`
 * in IDE tooltips and error messages. `Prettify` forces TypeScript to evaluate
 * the intersection into a single object type `{ ...A, ...B }`.
 *
 * @typeParam T - The type to flatten (typically an intersection)
 * @returns The same type with intersections evaluated into a single object
 *
 * @example Basic usage
 * ```typescript
 * type Messy = { a: 1 } & { b: 2 };   // Shown as "{ a: 1 } & { b: 2 }"
 * type Clean = Prettify<Messy>;        // Shown as "{ a: 1; b: 2 }"
 * ```
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * A descriptive error type that replaces silent `never` in inference contexts.
 *
 * ## Purpose
 *
 * When type inference fails, TypeScript typically returns `never`. This is
 * problematic because:
 *
 * 1. **Silent failures**: `never` disappears in unions (`A | never = A`)
 * 2. **Unclear errors**: IDE tooltips just show `never` with no context
 * 3. **Debugging difficulty**: Hard to trace why a type became `never`
 *
 * `InferenceError` provides a structured alternative that:
 * - Shows in IDE tooltips with source and message
 * - Doesn't disappear in unions (it's an object type, not `never`)
 * - Includes the problematic input for debugging
 *
 * @typeParam TSource - Identifier for where the error originated (e.g., type name)
 * @typeParam TMessage - Human-readable error description
 * @typeParam TInput - The problematic input that caused the inference failure
 *
 * @example Replacing silent never
 * ```typescript
 * // Before: Returns never silently
 * type ExtractName<T> = T extends { name: infer N } ? N : never;
 *
 * // After: Returns descriptive error
 * type ExtractName<T> = T extends { name: infer N }
 *   ? N
 *   : InferenceError<"ExtractName", "Input must have a 'name' property", T>;
 * ```
 */
export type InferenceError<TSource extends string, TMessage extends string, TInput = unknown> = {
  readonly __inferenceError: true;
  readonly __source: TSource;
  readonly __message: TMessage;
  readonly __input: TInput;
};

/**
 * Checks if a type is an `InferenceError`.
 *
 * Used to detect when a type utility returns an error instead of a valid value.
 * This allows code to handle errors before passing values to type constraints.
 *
 * @typeParam T - The type to check
 * @returns `true` if T is an `InferenceError`, `false` otherwise
 *
 * @example
 * ```typescript
 * type A = IsInferenceError<InferenceError<"Test", "Error", unknown>>; // true
 * type B = IsInferenceError<string>;                                   // false
 * type C = IsInferenceError<never>;                                    // false
 * ```
 */
export type IsInferenceError<T> = [T] extends [never]
  ? false
  : T extends { __inferenceError: true }
    ? true
    : false;

/**
 * Checks if a type is either `never` or an `InferenceError`.
 *
 * This is the standard way to check for invalid/error types in this codebase.
 * Use this instead of `IsNever` when the type might return `InferenceError`.
 *
 * @typeParam T - The type to check
 * @returns `true` if T is `never` or `InferenceError`, `false` otherwise
 *
 * @example
 * ```typescript
 * type A = IsInvalidOrError<never>;                                    // true
 * type B = IsInvalidOrError<InferenceError<"Test", "Error", unknown>>; // true
 * type C = IsInvalidOrError<string>;                                   // false
 * type D = IsInvalidOrError<1>;                                        // false
 * ```
 */
export type IsInvalidOrError<T> = [T] extends [never]
  ? true
  : T extends { __inferenceError: true }
    ? true
    : false;
