/**
 * Core Option type definitions.
 *
 * Option<T> is a discriminated union of Some<T> and None.
 * Some/None are interfaces, not classes -- implemented as plain objects with closures.
 */

import type { OPTION_BRAND } from "./brand.js";
import type { Result, Ok, Err } from "../core/types.js";

/**
 * The presence variant of `Option`. Represents a value that exists.
 *
 * `Some<T>` carries a `value` of type `T` and provides transformation,
 * chaining, extraction, and conversion methods. Instances are created
 * via the `some()` factory and are frozen plain objects branded with `OPTION_BRAND`.
 *
 * @example
 * ```ts
 * import { some } from '@hex-di/result';
 *
 * const opt = some(42);
 * opt.isSome();      // true
 * opt.map(x => x * 2); // Some(84)
 * opt.unwrapOr(0);   // 42
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/09-option.md — BEH-09-002
 */
export interface Some<T> {
  readonly _tag: "Some";
  readonly value: T;
  readonly [OPTION_BRAND]: true;

  // Type guards
  isSome(): this is Some<T>;
  isNone(): this is None;
  isSomeAnd(predicate: (value: T) => boolean): boolean;

  // Transformations
  map<U>(f: (value: T) => U): Some<U>;
  filter(predicate: (value: T) => boolean): Option<T>;
  flatten<U>(this: Some<Option<U>>): Option<U>;
  zip<U>(other: Option<U>): Option<[T, U]>;
  zipWith<U, R>(other: Option<U>, f: (a: T, b: U) => R): Option<R>;

  // Chaining
  andThen<U>(f: (value: T) => Option<U>): Option<U>;
  orElse(f: () => Option<T>): Some<T>;

  // Extraction
  match<A, B>(onSome: (value: T) => A, onNone: () => B): A;
  unwrapOr<U>(defaultValue: U): T;
  expect(message: string): T;

  // Conversion
  toResult<E>(onNone: () => E): Ok<T, E>;
  toNullable(): T;
  toUndefined(): T;

  // Serialization
  toJSON(): { _tag: "Some"; _schemaVersion: 1; value: T };

  // Bridge
  transpose<U, E>(this: Some<Result<U, E>>): Result<Some<U>, E>;
}

/**
 * The absence variant of `Option`. Represents the lack of a value.
 *
 * `None` carries no value and short-circuits all transformations and chaining operations.
 * Extraction methods return defaults or throw. A single frozen singleton is reused
 * for all `none()` calls.
 *
 * @example
 * ```ts
 * import { none } from '@hex-di/result';
 *
 * const opt = none();
 * opt.isNone();      // true
 * opt.map(x => x * 2); // None
 * opt.unwrapOr(0);   // 0
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/09-option.md — BEH-09-003
 */
export interface None {
  readonly _tag: "None";
  readonly [OPTION_BRAND]: true;

  // Type guards
  isSome(): this is Some<never>;
  isNone(): this is None;
  isSomeAnd(predicate: (value: never) => boolean): boolean;

  // Transformations
  map<U>(f: (value: never) => U): None;
  filter(predicate: (value: never) => boolean): None;
  flatten(): None;
  zip<U>(other: Option<U>): None;
  zipWith<U, R>(other: Option<U>, f: (a: never, b: U) => R): None;

  // Chaining
  andThen<U>(f: (value: never) => Option<U>): None;
  orElse<T>(f: () => Option<T>): Option<T>;

  // Extraction
  match<A, B>(onSome: (value: never) => A, onNone: () => B): B;
  unwrapOr<U>(defaultValue: U): U;
  expect(message: string): never;

  // Conversion
  toResult<E>(onNone: () => E): Err<never, E>;
  toNullable(): null;
  toUndefined(): undefined;

  // Serialization
  toJSON(): { _tag: "None"; _schemaVersion: 1 };

  // Bridge
  transpose(): Ok<None, never>;
}

/**
 * Discriminated union of `Some<T>` and `None`.
 *
 * `Option<T>` models the presence or absence of a value. TypeScript narrows
 * to the correct variant after checking `_tag`, `isSome()`, or `isNone()`.
 *
 * @example
 * ```ts
 * import { some, none } from '@hex-di/result';
 * import type { Option } from '@hex-di/result';
 *
 * function greet(name: Option<string>): string {
 *   return name.match(
 *     n => `Hello, ${n}!`,
 *     () => "Hello, stranger!"
 *   );
 * }
 *
 * greet(some("Alice")); // "Hello, Alice!"
 * greet(none());        // "Hello, stranger!"
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/09-option.md — BEH-09-004
 */
export type Option<T> = Some<T> | None;
