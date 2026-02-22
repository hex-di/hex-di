import type { Result } from "../core/types.js";
import { ok, err } from "../core/result.js";

/**
 * Wraps a function that might throw into a safe `Result`-returning form.
 *
 * Has two overloads based on the arity of `fn`:
 *
 * - **Zero-arg** (`fn.length === 0`): Executes `fn()` immediately and returns a `Result`.
 * - **Multi-arg** (`fn.length > 0`): Returns a new wrapper function with the same parameters
 *   that, when called, executes `fn(...args)` inside a try/catch and returns a `Result`.
 *
 * If `fn` returns successfully, the return value is wrapped in `Ok`.
 * If `fn` throws, the thrown value is passed through `mapErr` and wrapped in `Err`.
 *
 * @typeParam T - The return type of `fn`.
 * @typeParam E - The error type produced by `mapErr`.
 * @param fn - The function to execute or wrap.
 * @param mapErr - A function that transforms the caught `unknown` error into type `E`.
 * @returns A `Result<T, E>` (zero-arg) or a wrapped function returning `Result<T, E>` (multi-arg).
 *
 * @example
 * ```ts
 * import { fromThrowable } from '@hex-di/result';
 *
 * // Zero-arg: executes immediately
 * const result = fromThrowable(
 *   () => JSON.parse('{"a":1}'),
 *   (e) => `Parse error: ${e}`
 * );
 * // result is Ok({ a: 1 })
 *
 * // Multi-arg: returns a wrapped function
 * const safeParse = fromThrowable(
 *   (input: string) => JSON.parse(input),
 *   (e) => `Parse error: ${e}`
 * );
 * const parsed = safeParse('invalid');
 * // parsed is Err("Parse error: ...")
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/02-creation.md | BEH-02-001}
 */
export function fromThrowable<T, E>(fn: () => T, mapErr: (error: unknown) => E): Result<T, E>;
export function fromThrowable<A extends readonly unknown[], T, E>(
  fn: (...args: A) => T,
  mapErr: (error: unknown) => E
): (...args: A) => Result<T, E>;
export function fromThrowable(
  fn: (...args: unknown[]) => unknown,
  mapErr: (error: unknown) => unknown
): unknown {
  // If fn expects parameters, return a wrapped function
  if (fn.length > 0) {
    return (...args: unknown[]) => {
      try {
        return ok(fn(...args));
      } catch (e: unknown) {
        return err(mapErr(e));
      }
    };
  }

  // Zero-arg: execute immediately
  try {
    return ok(fn());
  } catch (e: unknown) {
    return err(mapErr(e));
  }
}
