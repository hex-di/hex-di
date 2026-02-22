import type { ResultAsync } from "@hex-di/result";

/**
 * Converts a key-based `ResultAsync`-returning function into an SWR fetcher.
 * Ok values are returned; Err values are thrown (as SWR expects).
 *
 * @typeParam K - The SWR key type (extends string)
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @param fn - Function taking a key and returning a {@link ResultAsync}
 * @returns A `(key: K) => Promise<T>` suitable for `useSWR(key, fetcher)`
 *
 * @example
 * ```ts
 * import { toSwrFetcher } from "@hex-di/result-react/adapters";
 * import useSWR from "swr";
 *
 * const fetcher = toSwrFetcher((key: string) => fetchData(key));
 * const { data, error } = useSWR("/api/users", fetcher);
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/05-adapters.md | BEH-R05-003}
 */
export function toSwrFetcher<K extends string, T, E>(
  fn: (key: K) => ResultAsync<T, E>,
): (key: K) => Promise<T> {
  return async (key: K) => {
    const result = await fn(key);
    if (result.isOk()) return result.value;
    throw result.error;
  };
}
