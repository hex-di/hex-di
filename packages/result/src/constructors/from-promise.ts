import { ResultAsync } from "../async/result-async.js";

/**
 * Wraps a promise that might reject into a ResultAsync.
 */
export function fromPromise<T, E>(
  promise: Promise<T>,
  mapErr: (error: unknown) => E
): ResultAsync<T, E> {
  return ResultAsync.fromPromise(promise, mapErr);
}

/**
 * Wraps a promise known to never reject.
 */
export function fromSafePromise<T>(promise: Promise<T>): ResultAsync<T, never> {
  return ResultAsync.fromSafePromise(promise);
}

/**
 * Wraps an async function that might throw into one that returns ResultAsync.
 */
export function fromAsyncThrowable<A extends readonly unknown[], T, E>(
  fn: (...args: A) => Promise<T>,
  mapErr: (error: unknown) => E
): (...args: A) => ResultAsync<T, E> {
  return ResultAsync.fromThrowable(fn, mapErr);
}
