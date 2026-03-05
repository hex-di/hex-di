import type { Result } from "../core/types.js";
import { ok, err, _setResultAsyncImpl } from "../core/result.js";
import type { InferOkUnion, InferErrUnion } from "../type-utils.js";
import { all } from "../combinators/all.js";
import { allSettled } from "../combinators/all-settled.js";
import { any } from "../combinators/any.js";
import { collect } from "../combinators/collect.js";
import { partition } from "../combinators/partition.js";
import { forEach } from "../combinators/for-each.js";
import { zipOrAccumulate } from "../combinators/zip-or-accumulate.js";

const RESULT_ASYNC_YIELD: unique symbol = Symbol("ResultAsync.yield");

function isNotYieldMarker<T>(value: T | typeof RESULT_ASYNC_YIELD): value is T {
  return value !== RESULT_ASYNC_YIELD;
}

// Helper to resolve a Result | ResultAsync to a Promise<Result>
function toPromiseResult<T, E>(value: Result<T, E> | ResultAsync<T, E>): Promise<Result<T, E>> {
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
 * Wraps a `Promise<Result<T, E>>` and provides method chaining for async operations.
 *
 * `ResultAsync` implements `PromiseLike<Result<T, E>>` so it can be awaited directly.
 * The internal promise never rejects -- all errors are captured as `Err` variants.
 * Instances can only be created via static factory methods (`ok`, `err`, `fromPromise`,
 * `fromSafePromise`, `fromThrowable`, `fromCallback`, `fromResult`).
 *
 * @example
 * ```ts
 * import { ResultAsync } from '@hex-di/result';
 *
 * const result = ResultAsync.fromPromise(
 *   fetch("/api/data").then(r => r.json()),
 *   (e) => `Fetch failed: ${e}`
 * );
 *
 * const value = await result
 *   .map(data => data.name)
 *   .unwrapOr("unknown");
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/06-async.md — BEH-06-001
 */
export class ResultAsync<T, E> {
  readonly #promise: Promise<Result<T, E>>;

  private constructor(promise: Promise<Result<T, E>>) {
    this.#promise = promise;
  }

  // --- Static constructors ---

  /**
   * Creates a `ResultAsync` wrapping an `Ok` value.
   *
   * @example
   * ```ts
   * import { ResultAsync } from '@hex-di/result';
   *
   * const result = ResultAsync.ok(42);
   * const inner = await result; // Ok(42)
   * ```
   *
   * @since v1.0.0
   * @see spec/result/behaviors/06-async.md — BEH-06-003
   */
  static ok<T>(value: T): ResultAsync<T, never> {
    return new ResultAsync(Promise.resolve(ok(value)));
  }

  /**
   * Creates a `ResultAsync` wrapping an `Err` value.
   *
   * @example
   * ```ts
   * import { ResultAsync } from '@hex-di/result';
   *
   * const result = ResultAsync.err("not found");
   * const inner = await result; // Err("not found")
   * ```
   *
   * @since v1.0.0
   * @see spec/result/behaviors/06-async.md — BEH-06-003
   */
  static err<E>(error: E): ResultAsync<never, E> {
    return new ResultAsync(Promise.resolve(err(error)));
  }

  /**
   * Wraps a `Promise<T>` that might reject into a `ResultAsync`.
   *
   * Resolution produces `Ok(value)`. Rejection produces `Err(mapErr(reason))`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from '@hex-di/result';
   *
   * const result = ResultAsync.fromPromise(
   *   fetch("/api/users").then(r => r.json()),
   *   (error) => `Request failed: ${error}`
   * );
   * ```
   *
   * @since v1.0.0
   * @see spec/result/behaviors/06-async.md — BEH-06-003
   */
  static fromPromise<T, E>(promise: Promise<T>, mapErr: (error: unknown) => E): ResultAsync<T, E> {
    return new ResultAsync(
      promise.then(
        (value): Result<T, E> => ok(value),
        (error: unknown): Result<T, E> => err(mapErr(error))
      )
    );
  }

  /**
   * Wraps a `Promise<T>` that is guaranteed to never reject into a `ResultAsync`.
   *
   * Resolution produces `Ok(value)`. Since the promise never rejects, the error
   * type is `never`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from '@hex-di/result';
   *
   * const result = ResultAsync.fromSafePromise(Promise.resolve(42));
   * const inner = await result; // Ok(42)
   * ```
   *
   * @since v1.0.0
   * @see spec/result/behaviors/06-async.md — BEH-06-003
   */
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

  /**
   * Wraps an async function that might throw into a function returning `ResultAsync`.
   *
   * Returns a new function with the same parameter types that returns `ResultAsync`
   * instead of `Promise`. Rejections are caught and mapped via `mapErr`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from '@hex-di/result';
   *
   * const safeReadFile = ResultAsync.fromThrowable(
   *   async (path: string) => fs.promises.readFile(path, "utf-8"),
   *   (error) => `Read failed: ${error}`
   * );
   *
   * const result = safeReadFile("config.json");
   * // ResultAsync<string, string>
   * ```
   *
   * @since v1.0.0
   * @see spec/result/behaviors/06-async.md — BEH-06-003
   */
  static fromThrowable<A extends readonly unknown[], T, E>(
    fn: (...args: A) => Promise<T>,
    mapErr: (error: unknown) => E
  ): (...args: A) => ResultAsync<T, E> {
    return (...args: A) => ResultAsync.fromPromise(fn(...args), mapErr);
  }

  static fromCallback<T, E>(
    fn: (callback: (error: E | null, value: T) => void) => void
  ): ResultAsync<T, E> {
    return new ResultAsync(
      new Promise<Result<T, E>>(resolve => {
        fn((error, value) => {
          if (error !== null && error !== undefined) {
            resolve(err(error));
          } else {
            resolve(ok(value));
          }
        });
      })
    );
  }

  static race<R extends readonly ResultAsync<unknown, unknown>[]>(
    ...results: R
  ): ResultAsync<InferOkUnion<R>, InferErrUnion<R>> {
    return new ResultAsync(
      Promise.race(results.map(r => r.#promise)) as Promise<
        Result<InferOkUnion<R>, InferErrUnion<R>>
      >
    );
  }

  // --- Static combinators ---

  static all = all;
  static allSettled = allSettled;
  static any = any;
  static collect = collect;
  static partition = partition;
  static forEach = forEach;
  static zipOrAccumulate = zipOrAccumulate;

  // --- PromiseLike ---

  then<A = Result<T, E>, B = never>(
    onfulfilled?: ((value: Result<T, E>) => A | PromiseLike<A>) | null | undefined,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null | undefined
  ): PromiseLike<A | B> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  // --- Generator protocol (ADR-019) ---

  *[Symbol.iterator](): Generator<ResultAsync<T, E>, T, T | typeof RESULT_ASYNC_YIELD> {
    const sent = yield this;
    if (isNotYieldMarker<T>(sent)) {
      return sent;
    }
    throw new Error("unreachable: ResultAsync iterator requires a value from safeTry runner");
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

  andThen<U, F>(f: (value: T) => Result<U, F> | ResultAsync<U, F>): ResultAsync<U, E | F> {
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

  orElse<U, F>(f: (error: E) => Result<U, F> | ResultAsync<U, F>): ResultAsync<T | U, F> {
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
    f: (value: T) => Result<unknown, F> | ResultAsync<unknown, F>
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

  async orDie(): Promise<T> {
    const result = await this.#promise;
    if (result._tag === "Ok") {
      return result.value;
    }
    throw result.error;
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

  // --- Effect error handling ---

  catchTag<Tag extends string, T2>(
    tag: Tag,
    handler: (error: Extract<E, { _tag: Tag }>) => Result<T2, never> | ResultAsync<T2, never>
  ): ResultAsync<T | T2, Exclude<E, { _tag: Tag }>> {
    return new ResultAsync(
      this.#promise.then(async (result): Promise<Result<T | T2, Exclude<E, { _tag: Tag }>>> => {
        if (result._tag === "Ok") {
          return ok(result.value);
        }
        const error = result.error;
        if (
          error !== null &&
          error !== undefined &&
          typeof error === "object" &&
          "_tag" in error &&
          error._tag === tag
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const handled = handler(error as any);
          if ("_tag" in handled) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
            return handled as any;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
          return (await handled) as any;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        return err(result.error) as any;
      })
    );
  }

  catchTags<
    Handlers extends Partial<{
      [K in Extract<E, { _tag: string }>["_tag"]]: (
        error: Extract<E, { _tag: K }>
      ) => Result<unknown, never> | ResultAsync<unknown, never>;
    }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  >(handlers: Handlers): any {
    return new ResultAsync(
      this.#promise.then(async (result): Promise<Result<unknown, unknown>> => {
        if (result._tag === "Ok") {
          return ok(result.value);
        }
        const error = result.error;
        if (
          error !== null &&
          error !== undefined &&
          typeof error === "object" &&
          "_tag" in error &&
          typeof error._tag === "string" &&
          error._tag in handlers
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const handler = (handlers as Record<string, ((e: any) => any) | undefined>)[error._tag];
          if (handler !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const handled = handler(error);
            if (handled !== null && typeof handled === "object" && "_tag" in handled) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return handled;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await handled;
          }
        }
        return err(result.error);
      })
    );
  }

  andThenWith<U, F, G>(
    onOk: (value: T) => Result<U, F> | ResultAsync<U, F>,
    onErr: (error: E) => Result<U, G> | ResultAsync<U, G>
  ): ResultAsync<U, F | G> {
    return new ResultAsync(
      this.#promise.then(async (result): Promise<Result<U, F | G>> => {
        if (result._tag === "Ok") {
          const next = onOk(result.value);
          return toPromiseResult(next);
        }
        const next = onErr(result.error);
        return toPromiseResult(next);
      })
    );
  }

  // --- Conversion ---

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

  async toJSON(): Promise<
    { _tag: "Ok"; _schemaVersion: 1; value: T } | { _tag: "Err"; _schemaVersion: 1; error: E }
  > {
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
