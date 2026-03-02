/**
 * ok() and err() factory functions.
 *
 * These create plain objects with methods as closures.
 * Ok/Err are structurally typed — phantom type parameters (E on Ok, T on Err)
 * are `never`, which is assignable to any type.
 */

import type { Ok, Err, Result, ResultAsync } from "./types.js";
import type { Option } from "../option/types.js";
import { RESULT_BRAND } from "./brand.js";
import { UnwrapError } from "../unsafe/unwrap-error.js";
import { some, none } from "../option/option.js";

// Lazy accessor for ResultAsync to avoid circular deps at module load time.
// Populated by the async module on import.
let _ResultAsyncImpl: {
  ok<T>(value: T): ResultAsync<T, never>;
  err<E>(error: E): ResultAsync<never, E>;
  fromSafePromise<T>(promise: Promise<T>): ResultAsync<T, never>;
} | null = null;

export function _setResultAsyncImpl(impl: typeof _ResultAsyncImpl): void {
  _ResultAsyncImpl = impl;
}

function getResultAsync(): NonNullable<typeof _ResultAsyncImpl> {
  if (_ResultAsyncImpl === null) {
    throw new Error(
      "ResultAsync not initialized. Import '@hex-di/result' instead of importing from core directly."
    );
  }
  return _ResultAsyncImpl;
}

// Ok's iterator returns value immediately (done: true on first next()).
// Implemented as a plain object instead of a generator* to avoid require-yield lint.
function createOkIterator<T>(value: T): Generator<never, T, unknown> {
  const doneResult: IteratorReturnResult<T> = { done: true, value };
  const iterator: Generator<never, T, unknown> = {
    next(): IteratorResult<never, T> {
      return doneResult;
    },
    return(v: T): IteratorResult<never, T> {
      return { done: true, value: v };
    },
    throw(e: unknown): IteratorResult<never, T> {
      throw e;
    },
    [Symbol.iterator]() {
      return iterator;
    },
  };
  return iterator;
}

/**
 * Creates a frozen {@link Ok} instance containing the given value.
 *
 * The returned object is a plain object implementing the `Ok<T, never>` interface.
 * All methods are closures capturing `value`. The object is stamped with
 * `[RESULT_BRAND]: true` and frozen via `Object.freeze()` before being returned.
 *
 * @typeParam T - The type of the success value.
 * @param value - The success value to wrap.
 * @returns A frozen `Ok<T, never>` instance.
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
 * @see {@link spec/result/behaviors/01-types-and-guards.md | BEH-01-007}
 */
export function ok<T>(value: T): Ok<T, never> {
  const self: Ok<T, never> = {
    _tag: "Ok",
    value,
    [RESULT_BRAND]: true,

    // Type guards — must use method shorthand for type predicates
    isOk(): this is Ok<T, never> {
      return true;
    },
    isErr(): this is Err<T, never> {
      return false;
    },
    isOkAnd(predicate) {
      return predicate(value);
    },
    isErrAnd() {
      return false;
    },

    // Transformations
    map(f) {
      return ok(f(value));
    },
    mapErr() {
      return self;
    },
    mapBoth(onOk) {
      return ok(onOk(value));
    },
    flatten(this: Ok<Result<never, never>, never>) {
      return this.value;
    },
    flip() {
      return err(value);
    },

    // Logical combinators
    and(other) {
      return other;
    },
    or() {
      return self;
    },

    // Chaining
    andThen(f) {
      return f(value);
    },
    orElse() {
      return self;
    },
    andTee(f) {
      try {
        f(value);
      } catch {
        // andTee swallows errors from f
      }
      return self;
    },
    orTee() {
      return self;
    },
    andThrough(f) {
      const result = f(value);
      if (result._tag === "Err") {
        return err(result.error);
      }
      return self;
    },
    inspect(f) {
      f(value);
      return self;
    },
    inspectErr() {
      return self;
    },

    // Effect error handling
    catchTag() {
      return self;
    },
    catchTags() {
      return self;
    },
    andThenWith(onOk) {
      return onOk(value);
    },

    // Extraction
    match(onOk) {
      return onOk(value);
    },
    unwrapOr() {
      return value;
    },
    unwrapOrElse() {
      return value;
    },
    mapOr(_defaultValue, f) {
      return f(value);
    },
    mapOrElse(_defaultF, f) {
      return f(value);
    },
    contains(v) {
      return value === v;
    },
    containsErr() {
      return false;
    },
    expect() {
      return value;
    },
    expectErr(message) {
      throw new UnwrapError(message, { _tag: "Ok", value });
    },
    orDie() {
      return value;
    },

    // Conversion
    toNullable() {
      return value;
    },
    toUndefined() {
      return value;
    },
    intoTuple() {
      return [null, value];
    },
    merge() {
      return value;
    },

    // Async bridges
    toAsync() {
      return getResultAsync().ok(value);
    },
    asyncMap(f) {
      return getResultAsync().fromSafePromise(f(value));
    },
    asyncAndThen(f) {
      return f(value);
    },

    // Option bridges
    toOption() {
      return some(value);
    },
    toOptionErr() {
      return none();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transpose(this: Ok<Option<any>, never>): any {
      // this.value is an Option: Some(v) → some(ok(v)), None → none()
      const inner = this.value;
      if (inner.isSome()) {
        return some(ok(inner.value));
      }
      return none();
    },

    // Serialization
    toJSON() {
      return { _tag: "Ok" as const, _schemaVersion: 1, value };
    },

    // Generator protocol — Ok returns value immediately (done: true)
    [Symbol.iterator](): Generator<never, T, unknown> {
      return createOkIterator(value);
    },
  };

  Object.freeze(self);
  return self;
}

/**
 * Creates a frozen {@link Err} instance containing the given error.
 *
 * The returned object is a plain object implementing the `Err<never, E>` interface.
 * All methods are closures capturing `error`. The object is stamped with
 * `[RESULT_BRAND]: true` and frozen via `Object.freeze()` before being returned.
 *
 * @typeParam E - The type of the error value.
 * @param error - The error value to wrap.
 * @returns A frozen `Err<never, E>` instance.
 *
 * @example
 * ```ts
 * import { err } from '@hex-di/result';
 *
 * const result = err('something went wrong');
 * console.log(result.isErr());  // true
 * console.log(result.error);    // 'something went wrong'
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/01-types-and-guards.md | BEH-01-008}
 */
export function err<E>(error: E): Err<never, E> {
  const self: Err<never, E> = {
    _tag: "Err",
    error,
    [RESULT_BRAND]: true,

    // Type guards
    isOk(): this is Ok<never, E> {
      return false;
    },
    isErr(): this is Err<never, E> {
      return true;
    },
    isOkAnd() {
      return false;
    },
    isErrAnd(predicate) {
      return predicate(error);
    },

    // Transformations
    map() {
      return self;
    },
    mapErr(f) {
      return err(f(error));
    },
    mapBoth(_onOk, onErr) {
      return err(onErr(error));
    },
    flatten() {
      return self;
    },
    flip() {
      return ok(error);
    },

    // Logical combinators
    and() {
      return self;
    },
    or(other) {
      return other;
    },

    // Chaining
    andThen() {
      return self;
    },
    orElse(f) {
      return f(error);
    },
    andTee() {
      return self;
    },
    orTee(f) {
      try {
        f(error);
      } catch {
        // orTee swallows errors from f
      }
      return self;
    },
    andThrough() {
      return self;
    },
    inspect() {
      return self;
    },
    inspectErr(f) {
      f(error);
      return self;
    },

    // Effect error handling — generic narrowing (Exclude<E, { _tag: Tag }>) cannot
    // be verified by TypeScript in method bodies. Runtime _tag checks guarantee safety.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catchTag(tag: string, handler: (error: any) => any) {
      if (
        error !== null &&
        error !== undefined &&
        typeof error === "object" &&
        "_tag" in error &&
        error._tag === tag
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return handler(error);
      }
      return self;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catchTags(handlers: Record<string, ((error: any) => any) | undefined>) {
      if (
        error !== null &&
        error !== undefined &&
        typeof error === "object" &&
        "_tag" in error &&
        typeof error._tag === "string" &&
        error._tag in handlers
      ) {
        const handler = handlers[error._tag];
        if (handler !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return handler(error);
        }
      }
      return self;
    },
    andThenWith(_onOk, onErr) {
      return onErr(error);
    },

    // Extraction
    match(_onOk, onErr) {
      return onErr(error);
    },
    unwrapOr(defaultValue) {
      return defaultValue;
    },
    unwrapOrElse(f) {
      return f(error);
    },
    mapOr(defaultValue) {
      return defaultValue;
    },
    mapOrElse(defaultF) {
      return defaultF(error);
    },
    contains() {
      return false;
    },
    containsErr(e) {
      return error === e;
    },
    expect(message) {
      throw new UnwrapError(message, { _tag: "Err", value: error });
    },
    expectErr() {
      return error;
    },
    orDie(): never {
      throw error;
    },

    // Conversion
    toNullable() {
      return null;
    },
    toUndefined() {
      return undefined;
    },
    intoTuple() {
      return [error, null];
    },
    merge() {
      return error;
    },

    // Async bridges
    toAsync() {
      return getResultAsync().err(error);
    },
    asyncMap() {
      return getResultAsync().err(error);
    },
    asyncAndThen() {
      return getResultAsync().err(error);
    },

    // Option bridges
    toOption() {
      return none();
    },
    toOptionErr() {
      return some(error);
    },
    transpose() {
      return some(self);
    },

    // Serialization
    toJSON() {
      return { _tag: "Err" as const, _schemaVersion: 1, error };
    },

    // Generator protocol
    *[Symbol.iterator]() {
      yield self;
      throw new Error("unreachable: generator continued after yield in Err");
    },
  };

  Object.freeze(self);
  return self;
}
