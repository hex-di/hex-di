import type { Result, ResultAsync } from "./core/types.js";

/** Extract the success type from a Result */
export type InferOk<R> =
  R extends Result<infer T, unknown> ? T : R extends ResultAsync<infer T, unknown> ? T : never;

/** Extract the error type from a Result */
export type InferErr<R> =
  R extends Result<unknown, infer E> ? E : R extends ResultAsync<unknown, infer E> ? E : never;

/** Extract the success type from a ResultAsync */
export type InferAsyncOk<R> = R extends ResultAsync<infer T, unknown> ? T : never;

/** Extract the error type from a ResultAsync */
export type InferAsyncErr<R> = R extends ResultAsync<unknown, infer E> ? E : never;

/** Check if a type is a Result */
export type IsResult<T> = T extends Result<unknown, unknown> ? true : false;

/** Check if a type is a ResultAsync */
export type IsResultAsync<T> = T extends ResultAsync<unknown, unknown> ? true : false;

/** Unwrap nested Result types */
export type FlattenResult<R> =
  R extends Result<Result<infer T, infer E1>, infer E2> ? Result<T, E1 | E2> : R;

/** Extract Ok types from a tuple of Results */
export type InferOkTuple<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[],
> = {
  [K in keyof T]: InferOk<T[K]>;
};

/** Extract the union of all Err types from a tuple of Results */
export type InferErrUnion<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[],
> = InferErr<T[number]>;

/** Extract Ok types from a record of Results */
export type InferOkRecord<
  T extends Record<string, Result<unknown, unknown> | ResultAsync<unknown, unknown>>,
> = {
  [K in keyof T]: InferOk<T[K]>;
};

/** Extract the union of Ok types from a tuple (for Result.any) */
export type InferOkUnion<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[],
> = InferOk<T[number]>;

/** Extract Err types as a tuple (for Result.any error collection) */
export type InferErrTuple<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[],
> = {
  [K in keyof T]: InferErr<T[K]>;
};
