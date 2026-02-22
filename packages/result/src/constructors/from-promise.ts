import { ResultAsync } from "../async/result-async.js";

/**
 * Wraps a `Promise` that might reject into a `ResultAsync`.
 *
 * If the promise resolves, the `ResultAsync` contains `Ok(value)`.
 * If it rejects, the rejection reason is passed through `mapErr` and the
 * `ResultAsync` contains `Err(mapErr(reason))`.
 *
 * @typeParam T - The resolved value type of the promise.
 * @typeParam E - The error type produced by `mapErr`.
 * @param promise - A promise that may reject.
 * @param mapErr - A function that transforms the `unknown` rejection reason into type `E`.
 * @returns A `ResultAsync<T, E>` wrapping the promise outcome.
 *
 * @example
 * ```ts
 * import { fromPromise } from '@hex-di/result';
 *
 * const result = fromPromise(
 *   fetch('https://api.example.com/data').then((r) => r.json()),
 *   (e) => `Fetch failed: ${e}`
 * );
 * // result is ResultAsync<unknown, string>
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/02-creation.md | BEH-02-005}
 */
export function fromPromise<T, E>(
  promise: Promise<T>,
  mapErr: (error: unknown) => E
): ResultAsync<T, E> {
  return ResultAsync.fromPromise(promise, mapErr);
}

/**
 * Wraps a `Promise` that is known to never reject into a `ResultAsync`.
 *
 * The `ResultAsync` will always contain `Ok(value)`. The error type is `never`.
 *
 * **Warning**: If the promise does reject despite the caller's assertion, the
 * rejection will propagate as an unhandled promise rejection. Use {@link fromPromise}
 * if rejection is possible.
 *
 * @typeParam T - The resolved value type of the promise.
 * @param promise - A promise that is guaranteed not to reject.
 * @returns A `ResultAsync<T, never>` that always resolves to `Ok(value)`.
 *
 * @example
 * ```ts
 * import { fromSafePromise } from '@hex-di/result';
 *
 * const result = fromSafePromise(Promise.resolve(42));
 * // result is ResultAsync<number, never>
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/02-creation.md | BEH-02-006}
 */
export function fromSafePromise<T>(promise: Promise<T>): ResultAsync<T, never> {
  return ResultAsync.fromSafePromise(promise);
}

/**
 * Wraps an async function that might throw or reject into one that returns `ResultAsync`.
 *
 * Returns a new function with the same parameter types as `fn`. When called,
 * the wrapper invokes `fn(...args)` and wraps the resulting promise: resolved values
 * become `Ok`, and rejections are passed through `mapErr` to become `Err`.
 *
 * @typeParam A - The argument types of the async function.
 * @typeParam T - The resolved value type of the async function.
 * @typeParam E - The error type produced by `mapErr`.
 * @param fn - An async function that might throw or return a rejecting promise.
 * @param mapErr - A function that transforms the `unknown` rejection reason into type `E`.
 * @returns A new function with the same parameters that returns `ResultAsync<T, E>`.
 *
 * @example
 * ```ts
 * import { fromAsyncThrowable } from '@hex-di/result';
 *
 * const safeFetch = fromAsyncThrowable(
 *   async (url: string) => {
 *     const response = await fetch(url);
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return response.json();
 *   },
 *   (e) => (e as Error).message
 * );
 *
 * const result = safeFetch('https://api.example.com/data');
 * // result is ResultAsync<unknown, string>
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/02-creation.md | BEH-02-007}
 */
export function fromAsyncThrowable<A extends readonly unknown[], T, E>(
  fn: (...args: A) => Promise<T>,
  mapErr: (error: unknown) => E
): (...args: A) => ResultAsync<T, E> {
  return ResultAsync.fromThrowable(fn, mapErr);
}
