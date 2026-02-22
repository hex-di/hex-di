import type { Option } from "@hex-di/result";

/**
 * Pattern-matches an {@link Option} using named handlers. Safe for server
 * components and non-React contexts.
 *
 * @typeParam T - The Some value type
 * @typeParam A - The return type of the `some` handler
 * @typeParam B - The return type of the `none` handler
 * @returns The return value of the matched handler
 *
 * @example
 * ```ts
 * import { matchOption } from "@hex-di/result-react/server";
 * import { some, none } from "@hex-di/result";
 *
 * const label = matchOption(some("Alice"), {
 *   some: (name) => `Hello, ${name}`,
 *   none: () => "Guest",
 * }); // "Hello, Alice"
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/07-server.md | BEH-R07-003}
 */
export function matchOption<T, A, B>(
  option: Option<T>,
  handlers: { some: (value: T) => A; none: () => B },
): A | B {
  return option.match(handlers.some, handlers.none);
}
