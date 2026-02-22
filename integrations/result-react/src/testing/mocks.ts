import { ResultAsync } from "@hex-di/result";

/**
 * Creates a deferred {@link ResultAsync} with manual `resolve`/`reject` controls
 * for testing async flows. Double-settling throws.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @returns `{ resultAsync, resolve, reject, isSettled }`
 *
 * @example
 * ```ts
 * import { mockResultAsync } from "@hex-di/result-react/testing";
 *
 * const mock = mockResultAsync<string, Error>();
 *
 * // Pass mock.resultAsync to the hook/component under test
 * const { result } = renderHook(() => useResultAsync(() => mock.resultAsync, []));
 *
 * // Resolve at the right time
 * await act(() => mock.resolve("data"));
 * expect(result.current.result).toBeOk("data");
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/06-testing.md | BEH-R06-004}
 */
export function mockResultAsync<T, E>(): {
  resultAsync: ResultAsync<T, E>;
  resolve: (value: T) => void;
  reject: (error: E) => void;
  isSettled: () => boolean;
} {
  let settled = false;
  let resolvePromise: ((value: T) => void) | null = null;
  let rejectPromise: ((error: E) => void) | null = null;

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject as (error: E) => void;
  });

  const resultAsync = ResultAsync.fromPromise(promise, (e) => e as E);

  return {
    resultAsync,
    resolve: (value: T) => {
      if (settled) throw new Error("MockResultAsync already settled");
      settled = true;
      resolvePromise!(value);
    },
    reject: (error: E) => {
      if (settled) throw new Error("MockResultAsync already settled");
      settled = true;
      rejectPromise!(error);
    },
    isSettled: () => settled,
  };
}
