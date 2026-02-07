import type { ResultAsync } from "../core/types.js";
import { ResultAsyncImpl } from "../async/result-async.js";

/**
 * Wraps a promise that might reject into a ResultAsync.
 */
export function fromPromise<T, E>(
  promise: Promise<T>,
  mapErr: (error: unknown) => E
): ResultAsync<T, E> {
  return ResultAsyncImpl.fromPromise(promise, mapErr);
}

/**
 * Wraps a promise known to never reject.
 */
export function fromSafePromise<T>(promise: Promise<T>): ResultAsync<T, never> {
  return ResultAsyncImpl.fromSafePromise(promise);
}

/**
 * Wraps an async function that might throw into one that returns ResultAsync.
 */
export function fromAsyncThrowable<A extends readonly unknown[], T, E>(
  fn: (...args: A) => Promise<T>,
  mapErr: (error: unknown) => E
): (...args: A) => ResultAsync<T, E> {
  return ResultAsyncImpl.fromThrowable(fn, mapErr);
}
