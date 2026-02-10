import type { Result, ResultAsync as ResultAsyncType } from "../core/types.js";
import { ok, err, _setResultAsyncImpl } from "../core/result.js";
import { all } from "../combinators/all.js";
import { allSettled } from "../combinators/all-settled.js";
import { any } from "../combinators/any.js";
import { collect } from "../combinators/collect.js";

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
export class ResultAsync<T, E> implements ResultAsyncType<T, E> {
  readonly #promise: Promise<Result<T, E>>;

  private constructor(promise: Promise<Result<T, E>>) {
    this.#promise = promise;
  }

  // --- Static constructors ---

  static ok<T>(value: T): ResultAsync<T, never> {
    return new ResultAsync(Promise.resolve(ok(value)));
  }

  static err<E>(error: E): ResultAsync<never, E> {
    return new ResultAsync(Promise.resolve(err(error)));
  }

  static fromPromise<T, E>(promise: Promise<T>, mapErr: (error: unknown) => E): ResultAsync<T, E> {
    return new ResultAsync(
      promise.then(
        (value): Result<T, E> => ok(value),
        (error: unknown): Result<T, E> => err(mapErr(error))
      )
    );
  }

  static fromSafePromise<T>(promise: Promise<T>): ResultAsync<T, never> {
    return new ResultAsync(promise.then(value => ok(value)));
  }

  /**
   * Creates a ResultAsync from a Promise that resolves to a Result.
   *
   * This is useful when you have an async function that already returns Result
   * values (e.g., sequential effect execution loops that check `_tag` and return
   * early on error). It avoids the need for `andThen` flattening, which has
   * inference issues in TypeScript 5.9.
   *
   * The promise must never reject — it should always resolve to either
   * ok(value) or err(error).
   *
   * @param promise - A Promise that resolves to a Result<T, E>
   * @returns A ResultAsync<T, E> wrapping the promise
   */
  static fromResult<T, E>(promise: Promise<Result<T, E>>): ResultAsync<T, E> {
    return new ResultAsync(promise);
  }

  static fromThrowable<A extends readonly unknown[], T, E>(
    fn: (...args: A) => Promise<T>,
    mapErr: (error: unknown) => E
  ): (...args: A) => ResultAsync<T, E> {
    return (...args: A) => ResultAsync.fromPromise(fn(...args), mapErr);
  }

  // --- Static combinators ---

  static all = all;
  static allSettled = allSettled;
  static any = any;
  static collect = collect;

  // --- PromiseLike ---

  then<A = Result<T, E>, B = never>(
    onfulfilled?: ((value: Result<T, E>) => A | PromiseLike<A>) | null | undefined,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null | undefined
  ): PromiseLike<A | B> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  // --- Transformations ---

  map<U>(f: (value: T) => U | Promise<U>): ResultAsync<U, E> {
    return new ResultAsync(
      this.#promise.then(async (result): Promise<Result<U, E>> => {
        if (result._tag === "Err") {
          return err(result.error);
        }
        return ok(await resolveValue(f(result.value)));
      })
    );
  }

  mapErr<F>(f: (error: E) => F | Promise<F>): ResultAsync<T, F> {
    return new ResultAsync(
      this.#promise.then(async (result): Promise<Result<T, F>> => {
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
  ): ResultAsync<U, F> {
    return new ResultAsync(
      this.#promise.then(async (result): Promise<Result<U, F>> => {
        if (result._tag === "Ok") {
          return ok(await resolveValue(onOk(result.value)));
        }
        return err(await resolveValue(onErr(result.error)));
      })
    );
  }

  // --- Chaining ---

  andThen<U, F>(f: (value: T) => Result<U, F>): ResultAsync<U, E | F>;
  andThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;
  // eslint-disable-next-line @typescript-eslint/unified-signatures -- overloads needed for correct inference
  andThen<U, F>(f: (value: T) => Result<U, F> | ResultAsync<U, F>): ResultAsync<U, E | F>;
  andThen<U, F>(f: (value: T) => Result<U, F> | ResultAsyncType<U, F>): ResultAsync<U, E | F> {
    return new ResultAsync(
      this.#promise.then(async (result): Promise<Result<U, E | F>> => {
        if (result._tag === "Err") {
          return err(result.error);
        }
        const next = f(result.value);
        return toPromiseResult(next);
      })
    );
  }

  orElse<U, F>(f: (error: E) => Result<U, F>): ResultAsync<T | U, F>;
  orElse<U, F>(f: (error: E) => ResultAsync<U, F>): ResultAsync<T | U, F>;
  // eslint-disable-next-line @typescript-eslint/unified-signatures -- overloads needed for correct inference
  orElse<U, F>(f: (error: E) => Result<U, F> | ResultAsync<U, F>): ResultAsync<T | U, F>;
  orElse<U, F>(f: (error: E) => Result<U, F> | ResultAsyncType<U, F>): ResultAsync<T | U, F> {
    return new ResultAsync(
      this.#promise.then(async (result): Promise<Result<T | U, F>> => {
        if (result._tag === "Ok") {
          return ok(result.value);
        }
        const next = f(result.error);
        return toPromiseResult(next);
      })
    );
  }

  andTee(f: (value: T) => void | Promise<void>): ResultAsync<T, E> {
    return new ResultAsync(
      this.#promise.then(async result => {
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

  orTee(f: (error: E) => void | Promise<void>): ResultAsync<T, E> {
    return new ResultAsync(
      this.#promise.then(async result => {
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
  ): ResultAsync<T, E | F> {
    return new ResultAsync(
      this.#promise.then(async (result): Promise<Result<T, E | F>> => {
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

  inspect(f: (value: T) => void): ResultAsync<T, E> {
    return new ResultAsync(
      this.#promise.then(result => {
        if (result._tag === "Ok") {
          f(result.value);
        }
        return result;
      })
    );
  }

  inspectErr(f: (error: E) => void): ResultAsync<T, E> {
    return new ResultAsync(
      this.#promise.then(result => {
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
    const result = await this.#promise;
    if (result._tag === "Ok") {
      return onOk(result.value);
    }
    return onErr(result.error);
  }

  async unwrapOr<U>(defaultValue: U): Promise<T | U> {
    const result = await this.#promise;
    if (result._tag === "Ok") {
      return result.value;
    }
    return defaultValue;
  }

  async unwrapOrElse<U>(f: (error: E) => U): Promise<T | U> {
    const result = await this.#promise;
    if (result._tag === "Ok") {
      return result.value;
    }
    return f(result.error);
  }

  async toNullable(): Promise<T | null> {
    const result = await this.#promise;
    return result._tag === "Ok" ? result.value : null;
  }

  async toUndefined(): Promise<T | undefined> {
    const result = await this.#promise;
    return result._tag === "Ok" ? result.value : undefined;
  }

  async intoTuple(): Promise<[null, T] | [E, null]> {
    const result = await this.#promise;
    if (result._tag === "Ok") {
      return [null, result.value];
    }
    return [result.error, null];
  }

  async merge(): Promise<T | E> {
    const result = await this.#promise;
    if (result._tag === "Ok") {
      return result.value;
    }
    return result.error;
  }

  // --- Conversion ---

  flatten<U>(this: ResultAsync<Result<U, E>, E>): ResultAsync<U, E> {
    return new ResultAsync(
      this.#promise.then((result): Result<U, E> => {
        if (result._tag === "Err") {
          return err(result.error);
        }
        return result.value;
      })
    );
  }

  flip(): ResultAsync<E, T> {
    return new ResultAsync(
      this.#promise.then((result): Result<E, T> => {
        if (result._tag === "Ok") {
          return err(result.value);
        }
        return ok(result.error);
      })
    );
  }

  async toJSON(): Promise<{ _tag: "Ok"; value: T } | { _tag: "Err"; error: E }> {
    const result = await this.#promise;
    return result.toJSON();
  }
}

// Register with the sync module so ok/err can create ResultAsync
_setResultAsyncImpl({
  ok: ResultAsync.ok,
  err: ResultAsync.err,
  fromSafePromise: ResultAsync.fromSafePromise,
});
