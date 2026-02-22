import * as React from "react";
import { useState, useTransition } from "react";
import type { Result, ResultAsync } from "@hex-di/result";

const majorVersion = Number(React.version.split(".")[0]);
if (majorVersion < 19) {
  throw new Error(
    "useResultTransition requires React 19 (async transitions). " +
      `Detected React ${React.version}. ` +
      "Upgrade to React 19 or remove imports of useResultTransition.",
  );
}

/**
 * Wraps React 19's async `useTransition` for Result-returning async functions.
 * Keeps the previous UI visible while the transition is pending.
 *
 * Requires React 19 — throws at import time on React 18 (INV-R11).
 *
 * @typeParam T - The Ok value type
 * @typeParam E - The Err error type
 * @returns `{ result, isPending, startResultTransition }`
 *
 * @example
 * ```tsx
 * import { useResultTransition, Match } from "@hex-di/result-react";
 * import { fetchUser } from "./api";
 *
 * function UserSearch() {
 *   const { result, isPending, startResultTransition } = useResultTransition<User, string>();
 *
 *   const handleSearch = (query: string) => {
 *     startResultTransition(() => fetchUser(query));
 *   };
 *
 *   return (
 *     <>
 *       <input onChange={(e) => handleSearch(e.target.value)} />
 *       {isPending && <Spinner />}
 *       {result && <Match result={result} ok={(u) => <p>{u.name}</p>} err={(e) => <p>{e}</p>} />}
 *     </>
 *   );
 * }
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/03-composition-hooks.md | BEH-R03-004}
 */
export function useResultTransition<T, E>(): {
  result: Result<T, E> | undefined;
  isPending: boolean;
  startResultTransition: (
    fn: () => ResultAsync<T, E> | Promise<Result<T, E>>,
  ) => void;
} {
  const [result, setResult] = useState<Result<T, E> | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const startResultTransition = (
    fn: () => ResultAsync<T, E> | Promise<Result<T, E>>,
  ) => {
    startTransition(async () => {
      const r = await fn();
      setResult(r);
    });
  };

  return { result, isPending, startResultTransition };
}
