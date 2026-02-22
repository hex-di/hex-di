import { useState, useEffect, useRef } from "react";
import type { Result, Err, ResultAsync } from "@hex-di/result";
import { safeTry } from "@hex-di/result";

/**
 * Return type of {@link useSafeTry}.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @since v0.1.0
 */
export interface UseSafeTryReturn<T, E> {
  result: Result<T, E> | undefined;
  isLoading: boolean;
}

/**
 * Composes multiple `Result` values using a generator function via `safeTry`,
 * short-circuiting on the first `Err`.
 *
 * Accepts sync or async generators. The generator receives an {@link AbortSignal}
 * that is aborted on unmount or deps change (INV-R2).
 *
 * @typeParam T - The final Ok value type
 * @typeParam E - The Err error type
 * @param fn - Generator function that yields `Result` values
 * @param deps - React dependency list that triggers re-execution
 *
 * @example
 * ```tsx
 * import { useSafeTry } from "@hex-di/result-react";
 * import { ok, err } from "@hex-di/result";
 *
 * function ComposedData() {
 *   const { result, isLoading } = useSafeTry(function* () {
 *     const a = yield* ok(1);
 *     const b = yield* ok(2);
 *     return ok(a + b);
 *   }, []);
 *
 *   if (isLoading || !result) return <Spinner />;
 *   // result is Result<number, never>
 * }
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/03-composition-hooks.md | BEH-R03-003}
 */
export function useSafeTry<T, E>(
  fn:
    | ((signal: AbortSignal) => Generator<Err<never, E>, Result<T, E>, unknown>)
    | ((signal: AbortSignal) => AsyncGenerator<Err<never, E>, Result<T, E>, unknown>),
  deps: React.DependencyList,
): UseSafeTryReturn<T, E> {
  const [state, setState] = useState<{
    result: Result<T, E> | undefined;
    isLoading: boolean;
  }>({ result: undefined, isLoading: true });

  const generationRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const generation = ++generationRef.current;

    setState((prev) => ({ ...prev, isLoading: true }));

    const handleResult = (result: Result<T, E>) => {
      if (generation === generationRef.current && !controller.signal.aborted) {
        setState({ result, isLoading: false });
      }
    };

    const generator = fn(controller.signal);
    const resultOrAsync = safeTry(() => generator as never) as
      | Result<T, E>
      | ResultAsync<T, E>;

    // Check if it's a ResultAsync (has .then)
    if (resultOrAsync != null && typeof (resultOrAsync as PromiseLike<unknown>).then === "function") {
      (resultOrAsync as PromiseLike<Result<T, E>>).then(handleResult);
    } else {
      handleResult(resultOrAsync as Result<T, E>);
    }

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { result: state.result, isLoading: state.isLoading };
}
