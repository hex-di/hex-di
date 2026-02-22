import { useState, useEffect, useRef, useMemo } from "react";
import type { Result, ResultAsync } from "@hex-di/result";

/**
 * Options for {@link useResultAsync} retry behaviour.
 *
 * @typeParam E - The error type used by `retryDelay` and `retryOn`
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/02-async-hooks.md | BEH-R02-001}
 */
export interface UseResultAsyncOptions<E> {
  retry?: number;
  retryDelay?: number | ((attempt: number, error: E) => number);
  retryOn?: (error: E) => boolean;
}

/**
 * Return type of {@link useResultAsync}.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @since v0.1.0
 */
export interface UseResultAsyncReturn<T, E> {
  result: Result<T, E> | undefined;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Eagerly executes an async function that returns a {@link ResultAsync} and
 * tracks its loading/result state. Re-executes whenever `deps` change.
 *
 * The `fn` receives an {@link AbortSignal} that is aborted on unmount, deps
 * change, or when {@link UseResultAsyncReturn.refetch | refetch} is called.
 * Stale responses from superseded generations are discarded (INV-R3).
 *
 * Supports automatic retry with exponential back-off via `options`.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @param fn - Async producer receiving an AbortSignal
 * @param deps - React dependency list that triggers re-execution
 * @param options - Optional retry configuration
 *
 * @example
 * ```tsx
 * import { useResultAsync, Match } from "@hex-di/result-react";
 * import { fetchUser } from "./api";
 *
 * function UserProfile({ id }: { id: string }) {
 *   const { result, isLoading, refetch } = useResultAsync(
 *     (signal) => fetchUser(id, signal),
 *     [id],
 *     { retry: 2, retryDelay: 1000 },
 *   );
 *
 *   if (isLoading || !result) return <Spinner />;
 *   return <Match result={result} ok={(u) => <p>{u.name}</p>} err={(e) => <p>{e}</p>} />;
 * }
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/02-async-hooks.md | BEH-R02-001}
 */
export function useResultAsync<T, E>(
  fn: (signal: AbortSignal) => ResultAsync<T, E>,
  deps: React.DependencyList,
  options?: UseResultAsyncOptions<E>,
): UseResultAsyncReturn<T, E> {
  const [state, setState] = useState<{
    result: Result<T, E> | undefined;
    isLoading: boolean;
  }>({ result: undefined, isLoading: true });

  const generationRef = useRef(0);
  const [refetchCount, setRefetchCount] = useState(0);

  const refetch = useMemo(
    () => () => setRefetchCount((c) => c + 1),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const generation = ++generationRef.current;

    setState((prev) => ({ ...prev, isLoading: true }));

    const execute = async () => {
      const maxAttempts = (options?.retry ?? 0) + 1;
      const retryOn = options?.retryOn ?? (() => true);

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (controller.signal.aborted) return;

        const result = await fn(controller.signal);

        if (controller.signal.aborted) return;

        if (result.isOk() || attempt === maxAttempts - 1 || !retryOn(result.error)) {
          if (generation === generationRef.current) {
            setState({ result, isLoading: false });
          }
          return;
        }

        // Wait before retry
        const delay =
          typeof options?.retryDelay === "function"
            ? options.retryDelay(attempt, result.error)
            : (options?.retryDelay ?? 1000);

        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, delay);
          controller.signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
        });
      }
    };

    void execute();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refetchCount]);

  return { result: state.result, isLoading: state.isLoading, refetch };
}
