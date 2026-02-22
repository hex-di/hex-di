import { useState, useRef, useMemo, useEffect } from "react";
import type { Result, ResultAsync } from "@hex-di/result";

/**
 * Return type of {@link useResultAction}.
 *
 * @typeParam A - Tuple of user-facing argument types (signal is stripped)
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @since v0.1.0
 */
export interface UseResultActionReturn<A extends unknown[], T, E> {
  result: Result<T, E> | undefined;
  isLoading: boolean;
  execute: (...args: A) => Promise<Result<T, E>>;
  reset: () => void;
}

/**
 * Lazy action hook: wraps an async function that returns a {@link ResultAsync}
 * and exposes an `execute` method that triggers it on demand.
 *
 * The function receives an {@link AbortSignal} as its first argument (stripped
 * from the `execute` signature). Calling `execute` again while a previous
 * invocation is in flight aborts the prior one. `reset` clears the result and
 * aborts any in-flight call. All actions are referentially stable (INV-R1).
 *
 * @typeParam A - Tuple of user-facing argument types
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @param fn - The async producer; first arg is an AbortSignal, rest are user args
 *
 * @example
 * ```tsx
 * import { useResultAction } from "@hex-di/result-react";
 *
 * function DeleteButton({ id }: { id: string }) {
 *   const { execute, isLoading, result } = useResultAction(
 *     (signal, id: string) => deleteUser(id, signal),
 *   );
 *
 *   return <button onClick={() => execute(id)} disabled={isLoading}>Delete</button>;
 * }
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/02-async-hooks.md | BEH-R02-002}
 */
export function useResultAction<A extends unknown[], T, E>(
  fn: (signal: AbortSignal, ...args: A) => ResultAsync<T, E> | Result<T, E>,
): UseResultActionReturn<A, T, E> {
  const [state, setState] = useState<{
    result: Result<T, E> | undefined;
    isLoading: boolean;
  }>({ result: undefined, isLoading: false });

  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const actions = useMemo(() => {
    const execute = async (...args: A): Promise<Result<T, E>> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const generation = ++generationRef.current;

      setState((prev) => ({ ...prev, isLoading: true }));

      const resultOrAsync = fnRef.current(controller.signal, ...args);
      const result = await resultOrAsync;

      if (generation === generationRef.current && !controller.signal.aborted) {
        setState({ result, isLoading: false });
      }

      return result;
    };

    const reset = () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      generationRef.current++;
      setState({ result: undefined, isLoading: false });
    };

    return { execute, reset };
  }, []);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return {
    result: state.result,
    isLoading: state.isLoading,
    ...actions,
  };
}
