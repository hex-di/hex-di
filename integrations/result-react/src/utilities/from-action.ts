import { ResultAsync } from "@hex-di/result";

/**
 * Wraps a throwing async function into one that returns a {@link ResultAsync}.
 * Caught errors are mapped through `mapErr`.
 *
 * @typeParam A - Tuple of argument types
 * @typeParam T - The success value type
 * @typeParam E - The mapped error type
 * @param action - The async function to wrap
 * @param mapErr - Transforms caught errors into type `E`
 * @returns A function with the same arguments returning `ResultAsync<T, E>`
 *
 * @example
 * ```ts
 * import { fromAction } from "@hex-di/result-react";
 *
 * const fetchUser = fromAction(
 *   async (id: string) => {
 *     const res = await fetch(`/api/users/${id}`);
 *     return res.json();
 *   },
 *   (e) => String(e),
 * );
 *
 * const result = await fetchUser("123"); // Result<User, string>
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/04-utilities.md | BEH-R04-001}
 */
export function fromAction<A extends unknown[], T, E>(
  action: (...args: A) => Promise<T>,
  mapErr: (error: unknown) => E,
): (...args: A) => ResultAsync<T, E> {
  return (...args: A) => ResultAsync.fromPromise(action(...args), mapErr);
}
