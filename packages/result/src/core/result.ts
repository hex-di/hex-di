/**
 * ok() and err() factory functions.
 *
 * These create plain objects with methods as closures.
 * Ok/Err are structurally typed — phantom type parameters (E on Ok, T on Err)
 * are `never`, which is assignable to any type.
 */

import type { Ok, Err, Result, ResultAsync } from "./types.js";

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

export function ok<T>(value: T): Ok<T, never> {
  const self: Ok<T, never> = {
    _tag: "Ok",
    value,

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
    expect() {
      return value;
    },
    expectErr(message) {
      throw new Error(message);
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

    // Serialization
    toJSON() {
      return { _tag: "Ok", value };
    },

    // Generator protocol — Ok returns value immediately (done: true)
    [Symbol.iterator](): Generator<never, T, unknown> {
      return createOkIterator(value);
    },
  };

  return self;
}

export function err<E>(error: E): Err<never, E> {
  const self: Err<never, E> = {
    _tag: "Err",
    error,

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
    expect(message) {
      throw new Error(message);
    },
    expectErr() {
      return error;
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

    // Serialization
    toJSON() {
      return { _tag: "Err", error };
    },

    // Generator protocol
    *[Symbol.iterator]() {
      yield self;
      throw new Error("unreachable: generator continued after yield in Err");
    },
  };

  return self;
}
