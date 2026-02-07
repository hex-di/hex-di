/**
 * Core Result type definitions.
 *
 * Result<T, E> is a discriminated union of Ok<T, E> and Err<T, E>.
 * Ok/Err are interfaces, not classes — implemented as plain objects with closures.
 */

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
  toNullable(): Promise<T | null>;
  toUndefined(): Promise<T | undefined>;
  intoTuple(): Promise<[null, T] | [E, null]>;
  merge(): Promise<T | E>;
  flatten<U>(this: ResultAsync<Result<U, E>, E>): ResultAsync<U, E>;
  flip(): ResultAsync<E, T>;
  toJSON(): Promise<{ _tag: "Ok"; value: T } | { _tag: "Err"; error: E }>;
}

export interface Ok<T, E> {
  readonly _tag: "Ok";
  readonly value: T;

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
  expect(message: string): T;
  expectErr(message: string): never;

  // Conversion
  toNullable(): T;
  toUndefined(): T;
  intoTuple(): [null, T];
  merge(): T;

  // Async bridges
  toAsync(): ResultAsync<T, E>;
  asyncMap<U>(f: (value: T) => Promise<U>): ResultAsync<U, E>;
  asyncAndThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;

  // Serialization
  toJSON(): { _tag: "Ok"; value: T };

  // Generator protocol
  [Symbol.iterator](): Generator<never, T, unknown>;
}

export interface Err<T, E> {
  readonly _tag: "Err";
  readonly error: E;

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
  expect(message: string): never;
  expectErr(message: string): E;

  // Conversion
  toNullable(): null;
  toUndefined(): undefined;
  intoTuple(): [E, null];
  merge(): E;

  // Async bridges
  toAsync(): ResultAsync<T, E>;
  asyncMap<U>(f: (value: T) => Promise<U>): ResultAsync<U, E>;
  asyncAndThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;

  // Serialization
  toJSON(): { _tag: "Err"; error: E };

  // Generator protocol
  [Symbol.iterator](): Generator<Err<never, E>, never, unknown>;
}

export type Result<T, E> = Ok<T, E> | Err<T, E>;
