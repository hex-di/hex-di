import { use, useRef } from "react";
import type { Result, ResultAsync } from "@hex-di/result";

/**
 * Suspense-compatible hook that throws a promise while loading, then returns
 * a {@link Result} (never `undefined`). Must be used inside a `<Suspense>` boundary.
 *
 * Err results are returned as values, not thrown — they do not trigger
 * ErrorBoundary (INV-R4, INV-R6). Re-suspends when `deps` change.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @param fn - Async producer returning a {@link ResultAsync}
 * @param deps - React dependency list that triggers re-suspension
 * @returns The resolved `Result<T, E>` (never `undefined`)
 *
 * @example
 * ```tsx
 * import { useResultSuspense, Match } from "@hex-di/result-react";
 * import { fetchUser } from "./api";
 *
 * function UserProfile({ id }: { id: string }) {
 *   const result = useResultSuspense(() => fetchUser(id), [id]);
 *   return <Match result={result} ok={(u) => <p>{u.name}</p>} err={(e) => <p>{e}</p>} />;
 * }
 *
 * // Usage:
 * // <Suspense fallback={<Spinner />}><UserProfile id="1" /></Suspense>
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/02-async-hooks.md | BEH-R02-003}
 */
export function useResultSuspense<T, E>(
  fn: () => ResultAsync<T, E>,
  deps: React.DependencyList,
): Result<T, E> {
  // Track deps manually since useMemo doesn't give us promise stability control
  const stateRef = useRef<{
    deps: React.DependencyList;
    promise: Promise<Result<T, E>>;
  } | null>(null);

  if (
    stateRef.current === null ||
    deps.length !== stateRef.current.deps.length ||
    deps.some((d, i) => !Object.is(d, stateRef.current!.deps[i]))
  ) {
    const resultAsync = fn();
    stateRef.current = {
      deps: [...deps],
      promise: Promise.resolve(
        resultAsync as unknown as PromiseLike<Result<T, E>>,
      ),
    };
  }

  return use(stateRef.current.promise);
}
