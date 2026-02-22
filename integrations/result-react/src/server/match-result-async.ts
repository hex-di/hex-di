import type { Result, ResultAsync } from "@hex-di/result";

/**
 * Awaits a {@link ResultAsync} (or `Promise<Result>`) then pattern-matches
 * using named handlers. Safe for server components.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @typeParam A - The return type of the `ok` handler
 * @typeParam B - The return type of the `err` handler
 * @returns A promise resolving to the matched handler's return value
 *
 * @example
 * ```ts
 * import { matchResultAsync } from "@hex-di/result-react/server";
 * import { ResultAsync } from "@hex-di/result";
 *
 * const data = await matchResultAsync(ResultAsync.ok("data"), {
 *   ok: (value) => value.toUpperCase(),
 *   err: () => "fallback",
 * }); // "DATA"
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/07-server.md | BEH-R07-002}
 */
export async function matchResultAsync<T, E, A, B>(
  resultAsync: ResultAsync<T, E> | Promise<Result<T, E>>,
  handlers: {
    ok: (value: T) => A | Promise<A>;
    err: (error: E) => B | Promise<B>;
  },
): Promise<A | B> {
  const result = await resultAsync;
  return result.match(handlers.ok, handlers.err);
}
