/**
 * Common utility types shared across @hex-di/graph.
 *
 * ## The `never` Type: Dual Semantics
 *
 * In this codebase, `never` is used with two distinct meanings:
 *
 * ### 1. Empty Set / Empty Union
 *
 * | Context | Meaning | Example |
 * |---------|---------|---------|
 * | `TRequires = never` | No dependencies | Adapter with empty requires array |
 * | `UnsatisfiedDeps = never` | All deps satisfied | Ready to build |
 * | `{ Logger: never }` | Logger has no deps | Leaf node in dependency graph |
 *
 * This is mathematically correct: `never` is the "bottom type" and acts as
 * the identity element for union types (`T | never = T`).
 *
 * ### 2. Error / Invalid State
 *
 * | Context | Meaning | Example |
 * |---------|---------|---------|
 * | `GetLifetimeLevel<Map, "Unknown">` | Port not found | Forward reference |
 * | `LifetimeName<99>` | Invalid level | Programming error |
 * | `AdapterProvidesName<InvalidType>` | Not an adapter | Type mismatch |
 *
 * When `never` indicates an error, it propagates through downstream types,
 * eventually causing a compile-time error or being caught by `IsNever<T>`.
 *
 * ### Disambiguation
 *
 * To distinguish between these semantics:
 *
 * 1. **Check context**: Is `never` the result of "nothing found" or "invalid input"?
 * 2. **Use `InferenceError`**: For error cases where `never` would be ambiguous,
 *    use `InferenceError<Source, Message, Input>` instead.
 * 3. **Check before use**: Use `IsNever<T>` to explicitly handle the `never` case.
 *
 * ```typescript
 * // Good: Explicit handling
 * type Result = IsNever<Deps> extends true
 *   ? "No dependencies"  // Empty set case
 *   : "Has dependencies";
 *
 * // Good: Use InferenceError for errors
 * type SafeExtract<T> = T extends { name: infer N }
 *   ? N
 *   : InferenceError<"SafeExtract", "Missing name property", T>;
 * ```
 *
 * ## Note on @internal Types
 *
 * Types in this module are marked `@internal` to indicate they are
 * implementation details of @hex-di/graph. They are exported for
 * cross-module use within this package.
 *
 * **External consumers should not rely on these types** - they may
 * change without notice between versions. For public utility types,
 * see the main package exports.
 *
 * @packageDocumentation
 */
import type { Port } from "@hex-di/ports";
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
 *
 * @internal
 */
export type IsNever<T> = [T] extends [never] ? true : false;
/**
 * Converts a tuple/array type to a union of its element types.
 *
 * @typeParam T - A tuple or array type
 * @returns Union of all element types, or `never` for empty array
 *
 * @internal
 */
export type TupleToUnion<T extends readonly Port<unknown, string>[]> = T extends readonly [] ? never : T[number];
/**
 * Flattens intersection types into a single object type for better readability.
 *
 * ## Purpose
 *
 * When types are intersected (`A & B`), TypeScript displays them as `A & B`
 * in IDE tooltips and error messages. `Prettify` forces TypeScript to evaluate
 * the intersection into a single object type `{ ...A, ...B }`.
 *
 * ## Why This Matters
 *
 * 1. **IDE Readability**: Tooltips show actual properties instead of opaque
 *    intersections. Compare:
 *    - Without: `{ a: 1 } & { b: 2 } & { c: 3 }`
 *    - With: `{ a: 1; b: 2; c: 3 }`
 *
 * 2. **Indexing Behavior**: Some type operations require fully evaluated
 *    object types. Intersections can cause unexpected `never` results when
 *    indexed with computed keys.
 *
 * 3. **Error Messages**: Compile errors become clearer when types are
 *    flattened rather than shown as chains of intersections.
 *
 * ## How It Works
 *
 * The mapped type `{ [K in keyof T]: T[K] }` iterates over all keys of T
 * and reconstructs the type. The trailing `& {}` is a TypeScript trick
 * that forces eager evaluation of the mapped type.
 *
 * @typeParam T - The type to flatten (typically an intersection)
 * @returns The same type with intersections evaluated into a single object
 *
 * @example Basic usage
 * ```typescript
 * type Messy = { a: 1 } & { b: 2 };   // Shown as "{ a: 1 } & { b: 2 }"
 * type Clean = Prettify<Messy>;        // Shown as "{ a: 1; b: 2 }"
 * ```
 *
 * @example With complex intersections
 * ```typescript
 * type Base = { id: string; name: string };
 * type WithMeta = Base & { createdAt: Date; updatedAt: Date };
 * type WithPermissions = WithMeta & { canEdit: boolean; canDelete: boolean };
 *
 * // Without Prettify: Base & { createdAt: Date; ... } & { canEdit: boolean; ... }
 * // With Prettify: { id: string; name: string; createdAt: Date; updatedAt: Date; canEdit: boolean; canDelete: boolean }
 * type User = Prettify<WithPermissions>;
 * ```
 *
 * @see {@link https://www.totaltypescript.com/concepts/the-prettify-helper | Matt Pocock's explanation}
 */
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
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
 * ## Usage
 *
 * Use this for internal debugging and advanced type inspection. The public
 * API continues to use template literal error messages for user-facing errors.
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
 *
 * // IDE now shows:
 * // { __inferenceError: true; __source: "ExtractName"; __message: "Input must have..." }
 * ```
 *
 * @example Debugging inference chains
 * ```typescript
 * type Debug = ExtractName<{ id: number }>;
 * // Hover shows: InferenceError<"ExtractName", "Input must have a 'name' property", { id: number }>
 * // Instead of just: never
 * ```
 *
 * @internal
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
 *
 * @internal
 */
export type IsInferenceError<T> = [T] extends [never] ? false : T extends {
    __inferenceError: true;
} ? true : false;
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
 *
 * @internal
 */
export type IsInvalidOrError<T> = [T] extends [never] ? true : T extends {
    __inferenceError: true;
} ? true : false;
