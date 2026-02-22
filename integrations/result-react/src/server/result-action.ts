import { ok, err, type Result } from "@hex-di/result";

/**
 * Wraps an async action into a function that returns `Promise<Result<T, E>>`.
 * Catches thrown errors and maps them with `mapErr`. Safe for server actions.
 *
 * @typeParam A - Tuple of argument types
 * @typeParam T - The success value type
 * @typeParam E - The mapped error type
 * @param action - The async function to wrap
 * @param mapErr - Transforms caught errors into the error type `E`
 * @returns A function with the same arguments that returns `Promise<Result<T, E>>`
 *
 * @example
 * ```ts
 * import { resultAction } from "@hex-di/result-react/server";
 *
 * const saveUser = resultAction(
 *   async (name: string) => {
 *     const user = await db.users.create({ name });
 *     return user;
 *   },
 *   (e) => String(e),
 * );
 *
 * const result = await saveUser("Alice"); // Result<User, string>
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/07-server.md | BEH-R07-004}
 */
export function resultAction<A extends unknown[], T, E>(
  action: (...args: A) => Promise<T>,
  mapErr: (error: unknown) => E,
): (...args: A) => Promise<Result<T, E>> {
  return async (...args: A): Promise<Result<T, E>> => {
    try {
      return ok(await action(...args));
    } catch (error) {
      return err(mapErr(error));
    }
  };
}
