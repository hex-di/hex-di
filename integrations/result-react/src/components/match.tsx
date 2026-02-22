import React from "react";
import type { Result } from "@hex-di/result";

/**
 * Props for the {@link Match} component.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/01-components.md | BEH-R01-001}
 */
export interface MatchProps<T, E> {
  result: Result<T, E>;
  ok: (value: T) => React.ReactNode;
  err: (error: E) => React.ReactNode;
}

/**
 * Renders one of two branches based on the variant of a {@link Result}.
 *
 * Uses React `key` isolation to unmount the previous branch and mount the new
 * one when the variant changes, preventing stale state leakage between branches.
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 *
 * @example
 * ```tsx
 * import { Match } from "@hex-di/result-react";
 * import { ok, err, type Result } from "@hex-di/result";
 *
 * function UserCard({ result }: { result: Result<User, string> }) {
 *   return (
 *     <Match
 *       result={result}
 *       ok={(user) => <p>{user.name}</p>}
 *       err={(msg) => <p className="error">{msg}</p>}
 *     />
 *   );
 * }
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/01-components.md | BEH-R01-001}
 */
export function Match<T, E>({
  result,
  ok,
  err,
}: MatchProps<T, E>): React.ReactElement {
  return result.isOk()
    ? <React.Fragment key="ok">{ok(result.value)}</React.Fragment>
    : <React.Fragment key="err">{err(result.error)}</React.Fragment>;
}
