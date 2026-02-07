import type { Result, ResultAsync as ResultAsyncType } from "../core/types.js";
import { ok, err, _setResultAsyncImpl } from "../core/result.js";

// Helper to resolve a Result | ResultAsync to a Promise<Result>
function toPromiseResult<T, E>(value: Result<T, E> | ResultAsyncType<T, E>): Promise<Result<T, E>> {
  if ("_tag" in value) {
    return Promise.resolve(value);
  }
  // It's a PromiseLike — await it
  return Promise.resolve().then(() => value);
}

// Helper to resolve a possibly-async value
async function resolveValue<T>(value: T | Promise<T>): Promise<T> {
  if (value instanceof Promise) {
    return value;
  }
  return value;
}

/**
 * ResultAsync<T, E> wraps a Promise<Result<T, E>> and provides
 * method chaining for async operations. Implements PromiseLike
 * so it can be awaited directly.
 *
 * Invariant: the internal promise NEVER rejects.
 */
export class ResultAsyncImpl<T, E> implements ResultAsyncType<T, E> {
  private readonly _promise: Promise<Result<T, E>>;

  private constructor(promise: Promise<Result<T, E>>) {
    this._promise = promise;
  }

  // --- Static constructors ---

  static ok<T>(value: T): ResultAsyncImpl<T, never> {
    return new ResultAsyncImpl(Promise.resolve(ok(value)));
  }

  static err<E>(error: E): ResultAsyncImpl<never, E> {
    return new ResultAsyncImpl(Promise.resolve(err(error)));
  }

  static fromPromise<T, E>(
    promise: Promise<T>,
    mapErr: (error: unknown) => E
  ): ResultAsyncImpl<T, E> {
    return new ResultAsyncImpl(
      promise.then(
        (value): Result<T, E> => ok(value),
        (error: unknown): Result<T, E> => err(mapErr(error))
      )
    );
  }

  static fromSafePromise<T>(promise: Promise<T>): ResultAsyncImpl<T, never> {
    return new ResultAsyncImpl(promise.then(value => ok(value)));
  }

  static fromThrowable<A extends readonly unknown[], T, E>(
    fn: (...args: A) => Promise<T>,
    mapErr: (error: unknown) => E
  ): (...args: A) => ResultAsyncImpl<T, E> {
    return (...args: A) => ResultAsyncImpl.fromPromise(fn(...args), mapErr);
  }

  // --- PromiseLike ---

  then<A = Result<T, E>, B = never>(
    onfulfilled?: ((value: Result<T, E>) => A | PromiseLike<A>) | null | undefined,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null | undefined
  ): PromiseLike<A | B> {
    return this._promise.then(onfulfilled, onrejected);
  }

  // --- Transformations ---

  map<U>(f: (value: T) => U | Promise<U>): ResultAsyncImpl<U, E> {
    return new ResultAsyncImpl(
      this._promise.then(async (result): Promise<Result<U, E>> => {
        if (result._tag === "Err") {
          return err(result.error);
        }
        return ok(await resolveValue(f(result.value)));
      })
    );
  }

  mapErr<F>(f: (error: E) => F | Promise<F>): ResultAsyncImpl<T, F> {
    return new ResultAsyncImpl(
      this._promise.then(async (result): Promise<Result<T, F>> => {
        if (result._tag === "Ok") {
          return ok(result.value);
        }
        return err(await resolveValue(f(result.error)));
      })
    );
  }

  mapBoth<U, F>(
    onOk: (value: T) => U | Promise<U>,
    onErr: (error: E) => F | Promise<F>
  ): ResultAsyncImpl<U, F> {
    return new ResultAsyncImpl(
      this._promise.then(async (result): Promise<Result<U, F>> => {
        if (result._tag === "Ok") {
          return ok(await resolveValue(onOk(result.value)));
        }
        return err(await resolveValue(onErr(result.error)));
      })
    );
  }

  // --- Chaining ---

  andThen<U, F>(f: (value: T) => Result<U, F> | ResultAsyncType<U, F>): ResultAsyncImpl<U, E | F> {
    return new ResultAsyncImpl(
      this._promise.then(async (result): Promise<Result<U, E | F>> => {
        if (result._tag === "Err") {
          return err(result.error);
        }
        const next = f(result.value);
        return toPromiseResult(next);
      })
    );
  }

  orElse<U, F>(f: (error: E) => Result<U, F> | ResultAsyncType<U, F>): ResultAsyncImpl<T | U, F> {
    return new ResultAsyncImpl(
      this._promise.then(async (result): Promise<Result<T | U, F>> => {
        if (result._tag === "Ok") {
          return ok(result.value);
        }
        const next = f(result.error);
        return toPromiseResult(next);
      })
    );
  }

  andTee(f: (value: T) => void | Promise<void>): ResultAsyncImpl<T, E> {
    return new ResultAsyncImpl(
      this._promise.then(async result => {
        if (result._tag === "Ok") {
          try {
            await resolveValue(f(result.value));
          } catch {
            // andTee swallows errors
          }
        }
        return result;
      })
    );
  }

  orTee(f: (error: E) => void | Promise<void>): ResultAsyncImpl<T, E> {
    return new ResultAsyncImpl(
      this._promise.then(async result => {
        if (result._tag === "Err") {
          try {
            await resolveValue(f(result.error));
          } catch {
            // orTee swallows errors
          }
        }
        return result;
      })
    );
  }

  andThrough<F>(
    f: (value: T) => Result<unknown, F> | ResultAsyncType<unknown, F>
  ): ResultAsyncImpl<T, E | F> {
    return new ResultAsyncImpl(
      this._promise.then(async (result): Promise<Result<T, E | F>> => {
        if (result._tag === "Err") {
          return err(result.error);
        }
        const sideResult = await toPromiseResult(f(result.value));
        if (sideResult._tag === "Err") {
          return err(sideResult.error);
        }
        return ok(result.value);
      })
    );
  }

  inspect(f: (value: T) => void): ResultAsyncImpl<T, E> {
    return new ResultAsyncImpl(
      this._promise.then(result => {
        if (result._tag === "Ok") {
          f(result.value);
        }
        return result;
      })
    );
  }

  inspectErr(f: (error: E) => void): ResultAsyncImpl<T, E> {
    return new ResultAsyncImpl(
      this._promise.then(result => {
        if (result._tag === "Err") {
          f(result.error);
        }
        return result;
      })
    );
  }

  // --- Extraction ---

  async match<A, B>(
    onOk: (value: T) => A | Promise<A>,
    onErr: (error: E) => B | Promise<B>
  ): Promise<A | B> {
    const result = await this._promise;
    if (result._tag === "Ok") {
      return onOk(result.value);
    }
    return onErr(result.error);
  }

  async unwrapOr<U>(defaultValue: U): Promise<T | U> {
    const result = await this._promise;
    if (result._tag === "Ok") {
      return result.value;
    }
    return defaultValue;
  }

  async unwrapOrElse<U>(f: (error: E) => U): Promise<T | U> {
    const result = await this._promise;
    if (result._tag === "Ok") {
      return result.value;
    }
    return f(result.error);
  }

  async toNullable(): Promise<T | null> {
    const result = await this._promise;
    return result._tag === "Ok" ? result.value : null;
  }

  async toUndefined(): Promise<T | undefined> {
    const result = await this._promise;
    return result._tag === "Ok" ? result.value : undefined;
  }

  async intoTuple(): Promise<[null, T] | [E, null]> {
    const result = await this._promise;
    if (result._tag === "Ok") {
      return [null, result.value];
    }
    return [result.error, null];
  }

  async merge(): Promise<T | E> {
    const result = await this._promise;
    if (result._tag === "Ok") {
      return result.value;
    }
    return result.error;
  }

  // --- Conversion ---

  flatten<U>(this: ResultAsyncImpl<Result<U, E>, E>): ResultAsyncImpl<U, E> {
    return new ResultAsyncImpl(
      this._promise.then((result): Result<U, E> => {
        if (result._tag === "Err") {
          return err(result.error);
        }
        return result.value;
      })
    );
  }

  flip(): ResultAsyncImpl<E, T> {
    return new ResultAsyncImpl(
      this._promise.then((result): Result<E, T> => {
        if (result._tag === "Ok") {
          return err(result.value);
        }
        return ok(result.error);
      })
    );
  }

  async toJSON(): Promise<{ _tag: "Ok"; value: T } | { _tag: "Err"; error: E }> {
    const result = await this._promise;
    return result.toJSON();
  }
}

// Register with the sync module so ok/err can create ResultAsync
_setResultAsyncImpl({
  ok: ResultAsyncImpl.ok,
  err: ResultAsyncImpl.err,
  fromSafePromise: ResultAsyncImpl.fromSafePromise,
});
