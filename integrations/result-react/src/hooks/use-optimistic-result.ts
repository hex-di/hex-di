import * as React from "react";
import { useOptimistic } from "react";
import type { Result } from "@hex-di/result";

if (typeof useOptimistic !== "function") {
  throw new Error(
    "useOptimisticResult requires React 19. " +
      `Detected React ${React.version} which does not export useOptimistic. ` +
      "Upgrade to React 19 or remove imports of useOptimisticResult.",
  );
}

/**
 * Wraps React 19's `useOptimistic` for `Result` values. Shows an optimistic
 * Ok state immediately while an async action completes. If the action fails,
 * React automatically reverts to the authoritative result.
 *
 * Requires React 19 — throws at import time on React 18 (INV-R11).
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @param result - The authoritative (server-confirmed) Result
 * @param updateFn - Reducer that merges the optimistic value into the current Result
 * @returns `{ result, setOptimistic }` — the displayed result and a setter for optimistic values
 *
 * @example
 * ```tsx
 * import { useOptimisticResult } from "@hex-di/result-react";
 * import { ok, type Result } from "@hex-di/result";
 *
 * function LikeButton({ likes }: { likes: Result<number, string> }) {
 *   const { result, setOptimistic } = useOptimisticResult(
 *     likes,
 *     (current, increment: number) => ok(current.isOk() ? current.value + increment : 0),
 *   );
 *   return <button onClick={() => setOptimistic(1)}>{result.isOk() && result.value}</button>;
 * }
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/03-composition-hooks.md | BEH-R03-002}
 */
export function useOptimisticResult<T, E>(
  result: Result<T, E>,
  updateFn: (current: Result<T, E>, optimistic: T) => Result<T, E>,
): {
  result: Result<T, E>;
  setOptimistic: (value: T) => void;
} {
  const [optimisticResult, setOptimistic] = useOptimistic(result, updateFn);
  return { result: optimisticResult, setOptimistic };
}
