import type { ResultAsync } from "@hex-di/result";

/**
 * Converts a `ResultAsync`-returning function into a TanStack Query `queryFn`.
 * Ok values are returned; Err values are thrown (as TanStack Query expects).
 *
 * @typeParam T - The Ok value type (becomes the query data type)
 * @typeParam E - The Err error type (becomes the thrown error)
 * @param fn - Function returning a {@link ResultAsync}
 * @returns A `() => Promise<T>` suitable for `useQuery({ queryFn })`
 *
 * @example
 * ```ts
 * import { toQueryFn } from "@hex-di/result-react/adapters";
 * import { useQuery } from "@tanstack/react-query";
 *
 * const { data, error } = useQuery({
 *   queryKey: ["user", id],
 *   queryFn: toQueryFn(() => fetchUser(id)),
 * });
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/05-adapters.md | BEH-R05-001}
 */
export function toQueryFn<T, E>(
  fn: () => ResultAsync<T, E>,
): () => Promise<T> {
  return async () => {
    const result = await fn();
    if (result.isOk()) return result.value;
    throw result.error;
  };
}

/**
 * Creates a `{ queryKey, queryFn }` object for TanStack Query's `useQuery`.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @param queryKey - The TanStack Query key
 * @param fn - Function returning a {@link ResultAsync}
 *
 * @example
 * ```ts
 * import { toQueryOptions } from "@hex-di/result-react/adapters";
 * import { useQuery } from "@tanstack/react-query";
 *
 * const { data } = useQuery(toQueryOptions(["user", id], () => fetchUser(id)));
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/05-adapters.md | BEH-R05-002}
 */
export function toQueryOptions<T, E>(
  queryKey: readonly unknown[],
  fn: () => ResultAsync<T, E>,
): { queryKey: readonly unknown[]; queryFn: () => Promise<T> } {
  return { queryKey, queryFn: toQueryFn(fn) };
}

/**
 * Converts a `ResultAsync`-returning function into a TanStack Query `mutationFn`.
 * Ok values are returned; Err values are thrown.
 *
 * @typeParam A - The mutation argument type
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @param fn - Function taking args and returning a {@link ResultAsync}
 * @returns A `(args: A) => Promise<T>` suitable for `useMutation({ mutationFn })`
 *
 * @example
 * ```ts
 * import { toMutationFn } from "@hex-di/result-react/adapters";
 * import { useMutation } from "@tanstack/react-query";
 *
 * const { mutate } = useMutation({
 *   mutationFn: toMutationFn((data: CreateUser) => createUser(data)),
 * });
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/05-adapters.md | BEH-R05-004}
 */
export function toMutationFn<A, T, E>(
  fn: (args: A) => ResultAsync<T, E>,
): (args: A) => Promise<T> {
  return async (args: A) => {
    const result = await fn(args);
    if (result.isOk()) return result.value;
    throw result.error;
  };
}

/**
 * Creates a mutation options object with `mutationFn` for TanStack Query's
 * `useMutation`. Additional options are spread into the result.
 *
 * @typeParam A - The mutation argument type
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @param fn - Function taking args and returning a {@link ResultAsync}
 * @param options - Additional mutation options to merge
 *
 * @example
 * ```ts
 * import { toMutationOptions } from "@hex-di/result-react/adapters";
 * import { useMutation } from "@tanstack/react-query";
 *
 * const { mutate } = useMutation(
 *   toMutationOptions((data: CreateUser) => createUser(data), {
 *     onSuccess: () => queryClient.invalidateQueries(["users"]),
 *   }),
 * );
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/05-adapters.md | BEH-R05-005}
 */
export function toMutationOptions<A, T, E>(
  fn: (args: A) => ResultAsync<T, E>,
  options?: Record<string, unknown>,
): Record<string, unknown> & { mutationFn: (args: A) => Promise<T> } {
  return { ...options, mutationFn: toMutationFn(fn) };
}
