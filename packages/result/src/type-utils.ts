import type { Result, ResultAsync } from "./core/types.js";

// =============================================================================
// Error Row Utilities (Tier 3)
// =============================================================================

/**
 * Constructs a frozen tagged error type. Type-level companion to `createError()`.
 *
 * @example
 * ```ts
 * import type { TaggedError } from '@hex-di/result';
 *
 * type NotFound = TaggedError<"NotFound", { resource: string }>;
 * // Readonly<{ _tag: "NotFound"; resource: string }>
 *
 * type Timeout = TaggedError<"Timeout">;
 * // Readonly<{ _tag: "Timeout" }>
 * ```
 *
 * @since v1.1.0
 * @see spec/result/type-system/error-row.md
 */
export type TaggedError<Tag extends string, Fields extends Record<string, unknown> = never> = [
  Fields,
] extends [never]
  ? Readonly<{ _tag: Tag }>
  : Readonly<{ _tag: Tag } & Fields>;

/**
 * Extracts all `_tag` literal values from a tagged error union.
 *
 * @example
 * ```ts
 * import type { TagsOf } from '@hex-di/result';
 *
 * type E = { _tag: "NotFound" } | { _tag: "Timeout" };
 * type Tags = TagsOf<E>; // "NotFound" | "Timeout"
 * ```
 *
 * @since v1.1.0
 * @see spec/result/type-system/error-row.md
 */
export type TagsOf<E> = E extends { _tag: infer Tag extends string } ? Tag : never;

/**
 * Boolean check: does the error union `E` contain a member with the given `_tag`?
 *
 * @example
 * ```ts
 * import type { HasTag } from '@hex-di/result';
 *
 * type E = { _tag: "NotFound" } | { _tag: "Timeout" };
 * type A = HasTag<E, "NotFound">; // true
 * type B = HasTag<E, "Unknown">;  // false
 * ```
 *
 * @since v1.1.0
 * @see spec/result/type-system/error-row.md
 */
export type HasTag<E, Tag extends string> = Extract<E, { _tag: Tag }> extends never ? false : true;

/**
 * Extracts the error member with a specific `_tag` from a union.
 * Readable alias for `Extract<E, { _tag: Tag }>`.
 *
 * @example
 * ```ts
 * import type { ErrorByTag } from '@hex-di/result';
 *
 * type E = { _tag: "NotFound"; resource: string } | { _tag: "Timeout"; ms: number };
 * type NF = ErrorByTag<E, "NotFound">; // { _tag: "NotFound"; resource: string }
 * ```
 *
 * @since v1.1.0
 * @see spec/result/type-system/error-row.md
 */
export type ErrorByTag<E, Tag extends string> = Extract<E, { _tag: Tag }>;

/**
 * Removes the error member with a specific `_tag` from a union.
 * Readable alias for `Exclude<E, { _tag: Tag }>`.
 *
 * @example
 * ```ts
 * import type { RemoveTag } from '@hex-di/result';
 *
 * type E = { _tag: "NotFound" } | { _tag: "Timeout" };
 * type Remaining = RemoveTag<E, "NotFound">; // { _tag: "Timeout" }
 * ```
 *
 * @since v1.1.0
 * @see spec/result/type-system/error-row.md
 */
export type RemoveTag<E, Tag extends string> = Exclude<E, { _tag: Tag }>;

/**
 * Removes multiple tagged members from an error union at once.
 * Recursive over a tuple of tag strings.
 *
 * @example
 * ```ts
 * import type { RemoveTags } from '@hex-di/result';
 *
 * type E = { _tag: "NotFound" } | { _tag: "Timeout" } | { _tag: "Forbidden" };
 * type Remaining = RemoveTags<E, ["NotFound", "Timeout"]>; // { _tag: "Forbidden" }
 * ```
 *
 * @since v1.1.0
 * @see spec/result/type-system/error-row.md
 */
export type RemoveTags<E, Tags extends readonly string[]> = Tags extends readonly [
  infer Head extends string,
  ...infer Tail extends string[],
]
  ? RemoveTags<Exclude<E, { _tag: Head }>, Tail>
  : E;

/**
 * Exhaustive handler map requiring a handler for every `_tag` in the error union.
 * Each handler must return `Result<T, never>` (infallible recovery).
 * Opt-in type annotation for `catchTags` — enforces that all error variants are handled.
 *
 * @example
 * ```ts
 * import type { ExhaustiveHandlerMap } from '@hex-di/result';
 * import { ok } from '@hex-di/result';
 *
 * type E = { _tag: "NotFound"; resource: string } | { _tag: "Timeout"; ms: number };
 * const handlers: ExhaustiveHandlerMap<E, string> = {
 *   NotFound: (e) => ok(`missing: ${e.resource}`),
 *   Timeout: (e) => ok(`timed out after ${e.ms}ms`),
 * };
 * ```
 *
 * @since v1.1.0
 * @see spec/result/type-system/error-row.md
 */
export type ExhaustiveHandlerMap<E extends { _tag: string }, T> = {
  [K in E["_tag"]]: (error: Extract<E, { _tag: K }>) => Result<T, never>;
};

/**
 * Extracts the success type `T` from a `Result<T, E>` or `ResultAsync<T, E>`.
 *
 * @example
 * ```ts
 * import { ok } from '@hex-di/result';
 * import type { InferOk } from '@hex-di/result';
 *
 * type R = ReturnType<typeof ok<number>>;
 * type T = InferOk<R>; // number
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type InferOk<R> =
  R extends Result<infer T, unknown> ? T : R extends ResultAsync<infer T, unknown> ? T : never;

/**
 * Extracts the error type `E` from a `Result<T, E>` or `ResultAsync<T, E>`.
 *
 * @example
 * ```ts
 * import { err } from '@hex-di/result';
 * import type { InferErr } from '@hex-di/result';
 *
 * type R = ReturnType<typeof err<string>>;
 * type E = InferErr<R>; // string
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type InferErr<R> =
  R extends Result<unknown, infer E> ? E : R extends ResultAsync<unknown, infer E> ? E : never;

/**
 * Extracts the success type `T` from a `ResultAsync<T, E>`.
 *
 * @example
 * ```ts
 * import type { ResultAsync, InferAsyncOk } from '@hex-di/result';
 *
 * type T = InferAsyncOk<ResultAsync<number, string>>; // number
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type InferAsyncOk<R> = R extends ResultAsync<infer T, unknown> ? T : never;

/**
 * Extracts the error type `E` from a `ResultAsync<T, E>`.
 *
 * @example
 * ```ts
 * import type { ResultAsync, InferAsyncErr } from '@hex-di/result';
 *
 * type E = InferAsyncErr<ResultAsync<number, string>>; // string
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type InferAsyncErr<R> = R extends ResultAsync<unknown, infer E> ? E : never;

/**
 * Evaluates to `true` if `T` is a `Result`, `false` otherwise.
 *
 * @example
 * ```ts
 * import type { Result, IsResult } from '@hex-di/result';
 *
 * type A = IsResult<Result<number, string>>; // true
 * type B = IsResult<string>;                 // false
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type IsResult<T> = T extends Result<unknown, unknown> ? true : false;

/**
 * Evaluates to `true` if `T` is a `ResultAsync`, `false` otherwise.
 *
 * @example
 * ```ts
 * import type { ResultAsync, IsResultAsync } from '@hex-di/result';
 *
 * type A = IsResultAsync<ResultAsync<number, string>>; // true
 * type B = IsResultAsync<string>;                      // false
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type IsResultAsync<T> = T extends ResultAsync<unknown, unknown> ? true : false;

/**
 * Unwraps a nested `Result<Result<T, E1>, E2>` into `Result<T, E1 | E2>`.
 * Returns the input type unchanged if it is not a nested Result.
 *
 * @example
 * ```ts
 * import type { Result, FlattenResult } from '@hex-di/result';
 *
 * type Nested = Result<Result<number, "inner">, "outer">;
 * type Flat = FlattenResult<Nested>; // Result<number, "inner" | "outer">
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type FlattenResult<R> =
  R extends Result<Result<infer T, infer E1>, infer E2> ? Result<T, E1 | E2> : R;

/**
 * Extracts the `Ok` types from a tuple of `Result` or `ResultAsync` values as a mapped tuple.
 *
 * @example
 * ```ts
 * import type { Result, InferOkTuple } from '@hex-di/result';
 *
 * type Rs = [Result<number, string>, Result<boolean, Error>];
 * type Oks = InferOkTuple<Rs>; // [number, boolean]
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type InferOkTuple<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[],
> = {
  [K in keyof T]: InferOk<T[K]>;
};

/**
 * Extracts the union of all `Err` types from a tuple of `Result` or `ResultAsync` values.
 *
 * @example
 * ```ts
 * import type { Result, InferErrUnion } from '@hex-di/result';
 *
 * type Rs = [Result<number, "a">, Result<boolean, "b">];
 * type Errs = InferErrUnion<Rs>; // "a" | "b"
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type InferErrUnion<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[],
> = InferErr<T[number]>;

/**
 * Extracts the `Ok` types from a record of `Result` or `ResultAsync` values as a mapped record.
 *
 * @example
 * ```ts
 * import type { Result, InferOkRecord } from '@hex-di/result';
 *
 * type Rs = { name: Result<string, Error>; age: Result<number, Error> };
 * type Oks = InferOkRecord<Rs>; // { name: string; age: number }
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type InferOkRecord<
  T extends Record<string, Result<unknown, unknown> | ResultAsync<unknown, unknown>>,
> = {
  [K in keyof T]: InferOk<T[K]>;
};

/**
 * Extracts the union of `Ok` types from a tuple of `Result` or `ResultAsync` values.
 * Useful for `Result.any` which returns a single Ok from the first success.
 *
 * @example
 * ```ts
 * import type { Result, InferOkUnion } from '@hex-di/result';
 *
 * type Rs = [Result<number, string>, Result<boolean, string>];
 * type OkU = InferOkUnion<Rs>; // number | boolean
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type InferOkUnion<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[],
> = InferOk<T[number]>;

/**
 * A non-empty array type that guarantees at least one element.
 * The first element is always present (`T`), followed by zero or more additional elements.
 *
 * @example
 * ```ts
 * import type { NonEmptyArray } from '@hex-di/result';
 *
 * const valid: NonEmptyArray<number> = [1, 2, 3]; // ok
 * // const invalid: NonEmptyArray<number> = [];    // type error
 *
 * function head<T>(arr: NonEmptyArray<T>): T {
 *   return arr[0]; // T, not T | undefined
 * }
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Extracts the `Err` types from a tuple of `Result` or `ResultAsync` values as a mapped tuple.
 * Useful for `Result.any` error collection.
 *
 * @example
 * ```ts
 * import type { Result, InferErrTuple } from '@hex-di/result';
 *
 * type Rs = [Result<number, "a">, Result<boolean, "b">];
 * type Errs = InferErrTuple<Rs>; // ["a", "b"]
 * ```
 *
 * @since v1.0.0
 * @see spec/result/type-system/utility.md
 */
export type InferErrTuple<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[],
> = {
  [K in keyof T]: InferErr<T[K]>;
};
