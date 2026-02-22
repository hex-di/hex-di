import type { Result, ResultAsync } from "@hex-di/result";

/**
 * A Suspense-compatible resource with `read`, `preload`, and `invalidate`.
 *
 * Each instance maintains its own cache — no shared global state (INV-R9).
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/02-async-hooks.md | BEH-R02-004}
 */
export interface ResultResource<T, E> {
  read(): Result<T, E>;
  preload(): void;
  invalidate(): void;
}

/**
 * Creates a Suspense-compatible {@link ResultResource} outside of React's
 * render cycle. Call `read()` inside a component to suspend until data is
 * available. `preload()` starts the fetch eagerly; `invalidate()` clears
 * the cache forcing a re-fetch on next `read()`.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @param fn - Async producer returning a {@link ResultAsync}
 * @returns A {@link ResultResource} with `read`, `preload`, and `invalidate`
 *
 * @example
 * ```tsx
 * import { createResultResource, Match } from "@hex-di/result-react";
 * import { fetchConfig } from "./api";
 *
 * const configResource = createResultResource(() => fetchConfig());
 * configResource.preload(); // optional: start eagerly
 *
 * function Config() {
 *   const result = configResource.read(); // suspends until resolved
 *   return <Match result={result} ok={(c) => <pre>{JSON.stringify(c)}</pre>} err={(e) => <p>{e}</p>} />;
 * }
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/02-async-hooks.md | BEH-R02-004}
 */
export function createResultResource<T, E>(
  fn: () => ResultAsync<T, E>,
): ResultResource<T, E> {
  let promise: Promise<Result<T, E>> | null = null;
  let result: Result<T, E> | null = null;

  function startFetch(): void {
    result = null;
    promise = fn().then((r: Result<T, E>) => {
      // Only store if this promise is still the active one
      if (promise === currentPromise) {
        result = r;
      }
      return r;
    }) as Promise<Result<T, E>>;
    // Capture current promise ref for the closure above
    const currentPromise = promise;
  }

  return {
    read(): Result<T, E> {
      if (result !== null) {
        return result;
      }
      if (promise === null) {
        startFetch();
      }
      // Throw promise to trigger Suspense
      throw promise;
    },

    preload(): void {
      if (promise === null) {
        startFetch();
      }
    },

    invalidate(): void {
      promise = null;
      result = null;
    },
  };
}
