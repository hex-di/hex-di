import type { Result } from "../core/types.js";
import { UnwrapError } from "./unwrap-error.js";

/**
 * Extracts the `Ok` value from a `Result`. Throws `UnwrapError` if the result is `Err`.
 *
 * This is an unsafe operation -- prefer `match()` or `unwrapOr()` in production code.
 * Import from `@hex-di/result/unsafe` to make usage explicit and detectable by linters.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { unwrap } from '@hex-di/result/unsafe';
 *
 * unwrap(ok(42));       // 42
 * unwrap(err("fail"));  // throws UnwrapError
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/11-unsafe.md — BEH-11-002
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.isOk()) {
    return result.value;
  }
  throw new UnwrapError("Called unwrap on Err", {
    _tag: "Err",
    value: result.error,
  });
}

/**
 * Extracts the `Err` error from a `Result`. Throws `UnwrapError` if the result is `Ok`.
 *
 * This is an unsafe operation -- prefer `match()` in production code.
 * Import from `@hex-di/result/unsafe` to make usage explicit and detectable by linters.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { unwrapErr } from '@hex-di/result/unsafe';
 *
 * unwrapErr(err("fail")); // "fail"
 * unwrapErr(ok(42));       // throws UnwrapError
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/11-unsafe.md — BEH-11-003
 */
export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (result.isErr()) {
    return result.error;
  }
  throw new UnwrapError("Called unwrapErr on Ok", {
    _tag: "Ok",
    value: result.value,
  });
}
