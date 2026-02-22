/**
 * some() and none() factory functions.
 *
 * These create plain objects with methods as closures.
 * Some/None are structurally typed -- implemented as frozen objects with a brand symbol.
 */

import type { Some, None, Option, } from "./types.js";
import type { Result } from "../core/types.js";
import { OPTION_BRAND } from "./brand.js";
import { UnwrapError } from "../unsafe/unwrap-error.js";
import { ok, err } from "../core/result.js";

/**
 * Creates a frozen `Some<T>` instance wrapping the given value.
 *
 * Constructs a plain object implementing the `Some<T>` interface with all
 * methods as closures capturing `value`. The object is stamped with
 * `OPTION_BRAND` and frozen via `Object.freeze()` before returning.
 *
 * @example
 * ```ts
 * import { some } from '@hex-di/result';
 *
 * const opt = some(42);
 * opt.isSome();       // true
 * opt.value;          // 42
 * opt.map(x => x + 1); // Some(43)
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/09-option.md — BEH-09-005
 */
export function some<T>(value: T): Some<T> {
  const self = {
    _tag: "Some" as const,
    value,
    [OPTION_BRAND]: true as const,

    // Type guards -- must use method shorthand for type predicates
    isSome(): boolean {
      return true;
    },
    isNone(): boolean {
      return false;
    },
    isSomeAnd(predicate: (value: T) => boolean): boolean {
      return predicate(value);
    },

    // Transformations
    map<U>(f: (value: T) => U): Some<U> {
      return some(f(value));
    },
    filter(predicate: (value: T) => boolean): Option<T> {
      return predicate(value) ? self as unknown as Some<T> : none();
    },
    flatten(): unknown {
      return value;
    },
    zip<U>(other: Option<U>): Option<[T, U]> {
      if (other._tag === "None") {
        return none();
      }
      return some([value, other.value] as [T, U]);
    },
    zipWith<U, R>(other: Option<U>, f: (a: T, b: U) => R): Option<R> {
      if (other._tag === "None") {
        return none();
      }
      return some(f(value, other.value));
    },

    // Chaining
    andThen<U>(f: (value: T) => Option<U>): Option<U> {
      return f(value);
    },
    orElse(): unknown {
      return self;
    },

    // Extraction
    match<A, B>(onSome: (value: T) => A, _onNone: () => B): A {
      return onSome(value);
    },
    unwrapOr(): T {
      return value;
    },
    expect(): T {
      return value;
    },

    // Conversion
    toResult(): unknown {
      return ok(value);
    },
    toNullable(): T {
      return value;
    },
    toUndefined(): T {
      return value;
    },

    // Serialization
    toJSON(): { _tag: "Some"; _schemaVersion: 1; value: T } {
      return { _tag: "Some" as const, _schemaVersion: 1 as const, value };
    },

    // Bridge
    transpose(): unknown {
      const inner = value as unknown as Result<unknown, unknown>;
      if (inner._tag === "Ok") {
        return ok(some(inner.value));
      }
      // inner._tag === "Err"
      return err(inner.error);
    },
  } as unknown as Some<T>;

  Object.freeze(self);
  return self;
}

/** Frozen singleton None instance */
let NONE_SINGLETON: None | null = null;

/**
 * Returns the frozen `None` singleton instance representing absence of a value.
 *
 * The singleton is stamped with `OPTION_BRAND` and frozen via `Object.freeze()`.
 * All calls to `none()` return the same singleton reference.
 *
 * @example
 * ```ts
 * import { none } from '@hex-di/result';
 *
 * const opt = none();
 * opt.isNone();      // true
 * opt.unwrapOr(0);   // 0
 * none() === none();  // true (singleton)
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/09-option.md — BEH-09-006
 */
export function none(): None {
  if (NONE_SINGLETON !== null) {
    return NONE_SINGLETON;
  }

  const self = {
    _tag: "None" as const,
    [OPTION_BRAND]: true as const,

    // Type guards
    isSome(): boolean {
      return false;
    },
    isNone(): boolean {
      return true;
    },
    isSomeAnd(): boolean {
      return false;
    },

    // Transformations
    map(): unknown {
      return self;
    },
    filter(): unknown {
      return self;
    },
    flatten(): unknown {
      return self;
    },
    zip(): unknown {
      return self;
    },
    zipWith(): unknown {
      return self;
    },

    // Chaining
    andThen(): unknown {
      return self;
    },
    orElse<T>(f: () => Option<T>): Option<T> {
      return f();
    },

    // Extraction
    match<A, B>(_onSome: (value: never) => A, onNone: () => B): B {
      return onNone();
    },
    unwrapOr<U>(defaultValue: U): U {
      return defaultValue;
    },
    expect(message: string): never {
      throw new UnwrapError(message, { _tag: "None" as "Ok", value: undefined });
    },

    // Conversion
    toResult<E>(onNone: () => E): unknown {
      return err(onNone());
    },
    toNullable(): null {
      return null;
    },
    toUndefined(): undefined {
      return undefined;
    },

    // Serialization
    toJSON(): { _tag: "None"; _schemaVersion: 1 } {
      return { _tag: "None" as const, _schemaVersion: 1 as const };
    },

    // Bridge
    transpose(): unknown {
      return ok(self);
    },
  } as unknown as None;

  Object.freeze(self);
  NONE_SINGLETON = self;
  return NONE_SINGLETON;
}
