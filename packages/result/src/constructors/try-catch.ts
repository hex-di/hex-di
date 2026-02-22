import type { Result } from "../core/types.js";
import { ok, err } from "../core/result.js";

/**
 * Executes a function immediately and catches any thrown value, returning a {@link Result}.
 *
 * If `fn()` returns successfully, wraps the return value in `Ok`.
 * If `fn()` throws, passes the caught value through `mapErr` and wraps it in `Err`.
 *
 * Unlike {@link fromThrowable}, `tryCatch` always executes immediately and only
 * accepts zero-arg functions. It has no wrapping overload.
 *
 * @typeParam T - The return type of `fn`.
 * @typeParam E - The error type produced by `mapErr`.
 * @param fn - A zero-arg function to execute.
 * @param mapErr - A function that transforms the caught `unknown` error into type `E`.
 * @returns `Ok(fn())` on success, `Err(mapErr(error))` on failure.
 *
 * @example
 * ```ts
 * import { tryCatch } from '@hex-di/result';
 *
 * const result = tryCatch(
 *   () => JSON.parse('{"valid": true}'),
 *   (e) => `Parse failed: ${e}`
 * );
 * // result is Ok({ valid: true })
 *
 * const failed = tryCatch(
 *   () => { throw new Error('boom'); },
 *   (e) => (e as Error).message
 * );
 * // failed is Err('boom')
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/02-creation.md | BEH-02-002}
 */
export function tryCatch<T, E>(fn: () => T, mapErr: (error: unknown) => E): Result<T, E> {
  try {
    return ok(fn());
  } catch (e: unknown) {
    return err(mapErr(e));
  }
}
