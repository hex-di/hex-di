import type { Result } from "@hex-di/result";

/**
 * Pattern-matches a {@link Result} using named handlers. Safe for server
 * components and non-React contexts.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @typeParam A - The return type of the `ok` handler
 * @typeParam B - The return type of the `err` handler
 * @returns The return value of the matched handler
 *
 * @example
 * ```ts
 * import { matchResult } from "@hex-di/result-react/server";
 * import { ok } from "@hex-di/result";
 *
 * const result = ok("hello");
 * const length = matchResult(result, {
 *   ok: (value) => value.length,
 *   err: () => -1,
 * }); // 5
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/07-server.md | BEH-R07-001}
 */
export function matchResult<T, E, A, B>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => A; err: (error: E) => B },
): A | B {
  return result.match(handlers.ok, handlers.err);
}
