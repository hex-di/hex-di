import { useState, useMemo } from "react";
import { ok, err, type Result } from "@hex-di/result";

/**
 * Return type of {@link useResult} when no initial value is provided.
 * `result` may be `undefined` until explicitly set.
 *
 * @since v0.1.0
 */
interface UseResultReturn<T, E> {
  result: Result<T, E> | undefined;
  setOk: (value: T) => void;
  setErr: (error: E) => void;
  set: (result: Result<T, E>) => void;
  reset: () => void;
}

/**
 * Return type of {@link useResult} when an initial value is provided.
 * `result` is always defined.
 *
 * @since v0.1.0
 */
interface UseResultReturnWithInitial<T, E> {
  result: Result<T, E>;
  setOk: (value: T) => void;
  setErr: (error: E) => void;
  set: (result: Result<T, E>) => void;
  reset: () => void;
}

/**
 * Manages a `Result<T, E>` as React state with convenience setters.
 *
 * Returns `setOk`, `setErr`, `set`, and `reset` actions that are
 * referentially stable across re-renders. When no initial value is given,
 * `result` starts as `undefined`; when an initial value is given, `result`
 * is always defined and `reset()` restores it.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 *
 * @example
 * ```tsx
 * import { useResult } from "@hex-di/result-react";
 * import type { Result } from "@hex-di/result";
 *
 * function LoginForm() {
 *   const { result, setOk, setErr, reset } = useResult<User, string>();
 *
 *   const handleSubmit = async (data: FormData) => {
 *     try {
 *       setOk(await login(data));
 *     } catch (e) {
 *       setErr(String(e));
 *     }
 *   };
 *
 *   return result === undefined
 *     ? <form onSubmit={handleSubmit}>...</form>
 *     : <Match result={result} ok={(u) => <p>{u.name}</p>} err={(e) => <p>{e}</p>} />;
 * }
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/03-composition-hooks.md | BEH-R03-001}
 */
export function useResult<T, E>(): UseResultReturn<T, E>;
export function useResult<T, E>(
  initial: Result<T, E>,
): UseResultReturnWithInitial<T, E>;
export function useResult<T, E>(
  initial?: Result<T, E>,
): UseResultReturn<T, E> | UseResultReturnWithInitial<T, E> {
  const [state, setState] = useState<Result<T, E> | undefined>(initial);

  const actions = useMemo(
    () => ({
      setOk: (value: T) => setState(ok(value)),
      setErr: (error: E) => setState(err(error)),
      set: (result: Result<T, E>) => setState(result),
      reset: () => setState(initial),
    }),
    // initial is captured once at initialization time
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { result: state, ...actions };
}
