/**
 * Core Result type definitions.
 *
 * Result<T, E> is a discriminated union of Ok<T, E> and Err<T, E>.
 * Ok/Err are interfaces, not classes — implemented as plain objects with closures.
 */

import type { RESULT_BRAND } from "./brand.js";
import type { Option, Some, None } from "../option/types.js";

// Forward declaration for ResultAsync (populated in async module)
export interface ResultAsync<T, E> extends PromiseLike<Result<T, E>> {
  map<U>(f: (value: T) => U | Promise<U>): ResultAsync<U, E>;
  mapErr<F>(f: (error: E) => F | Promise<F>): ResultAsync<T, F>;
  mapBoth<U, F>(
    onOk: (value: T) => U | Promise<U>,
    onErr: (error: E) => F | Promise<F>
  ): ResultAsync<U, F>;
  andThen<U, F>(f: (value: T) => Result<U, F> | ResultAsync<U, F>): ResultAsync<U, E | F>;
  orElse<U, F>(f: (error: E) => Result<U, F> | ResultAsync<U, F>): ResultAsync<T | U, F>;
  andTee(f: (value: T) => void | Promise<void>): ResultAsync<T, E>;
  orTee(f: (error: E) => void | Promise<void>): ResultAsync<T, E>;
  andThrough<F>(
    f: (value: T) => Result<unknown, F> | ResultAsync<unknown, F>
  ): ResultAsync<T, E | F>;
  inspect(f: (value: T) => void): ResultAsync<T, E>;
  inspectErr(f: (error: E) => void): ResultAsync<T, E>;
  match<A, B>(
    onOk: (value: T) => A | Promise<A>,
    onErr: (error: E) => B | Promise<B>
  ): Promise<A | B>;
  unwrapOr<U>(defaultValue: U): Promise<T | U>;
  unwrapOrElse<U>(f: (error: E) => U): Promise<T | U>;
  orDie(): Promise<T>;
  toNullable(): Promise<T | null>;
  toUndefined(): Promise<T | undefined>;
  intoTuple(): Promise<[null, T] | [E, null]>;
  merge(): Promise<T | E>;
  flatten<U>(this: ResultAsync<Result<U, E>, E>): ResultAsync<U, E>;
  flip(): ResultAsync<E, T>;
  toJSON(): Promise<{ _tag: "Ok"; _schemaVersion: 1; value: T } | { _tag: "Err"; _schemaVersion: 1; error: E }>;
}

/**
 * The success variant of {@link Result}. Contains a `value` of type `T`.
 *
 * `Ok` is an interface, not a class -- instances are plain objects with closure-based methods
 * created by the {@link ok} factory function. The phantom type parameter `E` has no runtime
 * representation; the `ok()` factory produces `Ok<T, never>`, where `never` extends any `E`.
 *
 * @typeParam T - The type of the success value.
 * @typeParam E - The type of the error (phantom on Ok; defaults to `never` from the factory).
 *
 * @example
 * ```ts
 * import { ok } from '@hex-di/result';
 *
 * const result = ok(42);
 * console.log(result.isOk());  // true
 * console.log(result.value);   // 42
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/01-types-and-guards.md | BEH-01-004}
 */
export interface Ok<T, E> {
  readonly _tag: "Ok";
  readonly value: T;
  readonly [RESULT_BRAND]: true;

  // Type guards
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  isOkAnd(predicate: (value: T) => boolean): boolean;
  isErrAnd(predicate: (error: E) => boolean): boolean;

  // Transformations
  map<U>(f: (value: T) => U): Ok<U, E>;
  mapErr<F>(f: (error: E) => F): Ok<T, F>;
  mapBoth<U, F>(onOk: (value: T) => U, onErr: (error: E) => F): Ok<U, F>;
  flatten<U, E2>(this: Ok<Result<U, E2>, E>): Result<U, E | E2>;
  flip(): Err<E, T>;

  // Logical combinators
  and<U, F>(other: Result<U, F>): Result<U, E | F>;
  or<U, F>(other: Result<U, F>): Ok<T, E>;

  // Chaining
  andThen<U, F>(f: (value: T) => Result<U, F>): Result<U, E | F>;
  orElse<U, F>(f: (error: E) => Result<U, F>): Ok<T, E>;
  andTee(f: (value: T) => void): Ok<T, E>;
  orTee(f: (error: E) => void): Ok<T, E>;
  andThrough<F>(f: (value: T) => Result<unknown, F>): Result<T, E | F>;
  inspect(f: (value: T) => void): Ok<T, E>;
  inspectErr(f: (error: E) => void): Ok<T, E>;

  // Extraction
  match<A, B>(onOk: (value: T) => A, onErr: (error: E) => B): A;
  unwrapOr<U>(defaultValue: U): T;
  unwrapOrElse<U>(f: (error: E) => U): T;
  mapOr<U>(defaultValue: U, f: (value: T) => U): U;
  mapOrElse<U>(defaultF: (error: E) => U, f: (value: T) => U): U;
  contains(value: T): boolean;
  containsErr(error: E): boolean;
  expect(message: string): T;
  expectErr(message: string): never;
  orDie(): T;

  // Conversion
  toNullable(): T;
  toUndefined(): T;
  intoTuple(): [null, T];
  merge(): T;

  // Async bridges
  toAsync(): ResultAsync<T, E>;
  asyncMap<U>(f: (value: T) => Promise<U>): ResultAsync<U, E>;
  asyncAndThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;

  // Option bridges
  toOption(): Some<T>;
  toOptionErr(): None;
  transpose<U>(this: Ok<Option<U>, E>): Option<Result<U, E>>;

  // Serialization
  toJSON(): { _tag: "Ok"; _schemaVersion: 1; value: T };

  // Generator protocol
  [Symbol.iterator](): Generator<never, T, unknown>;
}

/**
 * The failure variant of {@link Result}. Contains an `error` of type `E`.
 *
 * `Err` is an interface, not a class -- instances are plain objects with closure-based methods
 * created by the {@link err} factory function. The phantom type parameter `T` has no runtime
 * representation; the `err()` factory produces `Err<never, E>`, where `never` extends any `T`.
 *
 * @typeParam T - The type of the success value (phantom on Err; defaults to `never` from the factory).
 * @typeParam E - The type of the error.
 *
 * @example
 * ```ts
 * import { err } from '@hex-di/result';
 *
 * const result = err('not found');
 * console.log(result.isErr());  // true
 * console.log(result.error);    // 'not found'
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/01-types-and-guards.md | BEH-01-005}
 */
export interface Err<T, E> {
  readonly _tag: "Err";
  readonly error: E;
  readonly [RESULT_BRAND]: true;

  // Type guards
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  isOkAnd(predicate: (value: T) => boolean): boolean;
  isErrAnd(predicate: (error: E) => boolean): boolean;

  // Transformations
  map<U>(f: (value: T) => U): Err<U, E>;
  mapErr<F>(f: (error: E) => F): Err<T, F>;
  mapBoth<U, F>(onOk: (value: T) => U, onErr: (error: E) => F): Err<U, F>;
  flatten<U, E2>(this: Err<Result<U, E2>, E>): Err<U, E>;
  flip(): Ok<E, T>;

  // Logical combinators
  and<U, F>(other: Result<U, F>): Err<U, E>;
  or<U, F>(other: Result<U, F>): Result<T | U, F>;

  // Chaining
  andThen<U, F>(f: (value: T) => Result<U, F>): Err<U, E>;
  orElse<U, F>(f: (error: E) => Result<U, F>): Result<T | U, F>;
  andTee(f: (value: T) => void): Err<T, E>;
  orTee(f: (error: E) => void): Err<T, E>;
  andThrough<F>(f: (value: T) => Result<unknown, F>): Err<T, E>;
  inspect(f: (value: T) => void): Err<T, E>;
  inspectErr(f: (error: E) => void): Err<T, E>;

  // Extraction
  match<A, B>(onOk: (value: T) => A, onErr: (error: E) => B): B;
  unwrapOr<U>(defaultValue: U): U;
  unwrapOrElse<U>(f: (error: E) => U): U;
  mapOr<U>(defaultValue: U, f: (value: T) => U): U;
  mapOrElse<U>(defaultF: (error: E) => U, f: (value: T) => U): U;
  contains(value: T): boolean;
  containsErr(error: E): boolean;
  expect(message: string): never;
  expectErr(message: string): E;
  orDie(): never;

  // Conversion
  toNullable(): null;
  toUndefined(): undefined;
  intoTuple(): [E, null];
  merge(): E;

  // Async bridges
  toAsync(): ResultAsync<T, E>;
  asyncMap<U>(f: (value: T) => Promise<U>): ResultAsync<U, E>;
  asyncAndThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;

  // Option bridges
  toOption(): None;
  toOptionErr(): Some<E>;
  transpose(): Some<Err<never, E>>;

  // Serialization
  toJSON(): { _tag: "Err"; _schemaVersion: 1; error: E };

  // Generator protocol
  [Symbol.iterator](): Generator<Err<never, E>, never, unknown>;
}

/**
 * A discriminated union of {@link Ok} and {@link Err}.
 *
 * `Result<T, E>` represents either a success (`Ok`) holding a value of type `T`,
 * or a failure (`Err`) holding an error of type `E`. TypeScript narrows to the
 * correct variant after checking `_tag`, `isOk()`, or `isErr()`.
 *
 * @typeParam T - The type of the success value.
 * @typeParam E - The type of the error value.
 *
 * @example
 * ```ts
 * import { ok, err, type Result } from '@hex-di/result';
 *
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) return err('division by zero');
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.isOk()) {
 *   console.log(result.value); // 5
 * }
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/01-types-and-guards.md | BEH-01-006}
 */
export type Result<T, E> = Ok<T, E> | Err<T, E>;
