/**
 * Do notation primitives: bind and let_.
 *
 * These are standalone functions that return callbacks compatible with .andThen().
 * They build up a typed context object one field at a time.
 */

import type { Result } from "../core/types.js";
import { ok } from "../core/result.js";

/**
 * Adds a named Result value to the Do context. Short-circuits on Err.
 *
 * Returns a function compatible with `.andThen()` that evaluates `f` with the current
 * context. If `f` returns Ok, its value is added to the context under `name`. If `f`
 * returns Err, the chain short-circuits with that error. The `name` parameter must not
 * already exist in the context (enforced at the type level).
 *
 * @param name - The key to add to the context object
 * @param f - A function receiving the current context and returning a Result<T, E>
 * @returns A function compatible with .andThen()
 *
 * @example
 * ```ts
 * import { ok, err, bind, Result } from '@hex-di/result';
 *
 * const result = Result.Do
 *   .andThen(bind("x", () => ok(1)))
 *   .andThen(bind("y", ({ x }) => ok(x + 1)));
 * // => Ok({ x: 1, y: 2 })
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/12-do-notation.md — BEH-12-002
 */
export function bind<N extends string, Ctx extends Record<string, unknown>, T, E>(
  name: Exclude<N, keyof Ctx>,
  f: (ctx: Ctx) => Result<T, E>,
): (ctx: Ctx) => Result<Ctx & { readonly [K in N]: T }, E> {
  return (ctx: Ctx) => {
    const result = f(ctx);
    if (result.isErr()) {
      return result as unknown as Result<Ctx & { readonly [K in N]: T }, E>;
    }
    return ok({ ...ctx, [name]: result.value } as Ctx & { readonly [K in N]: T });
  };
}

/**
 * Adds a non-Result computed value to the Do context. Never short-circuits.
 *
 * Returns a function compatible with `.andThen()` that evaluates `f` with the current
 * context and adds the returned plain value under `name`. Since `f` returns a plain value
 * (not wrapped in Result), `let_` always succeeds. The trailing underscore avoids
 * collision with JavaScript's reserved `let` keyword.
 *
 * @param name - The key to add to the context object
 * @param f - A function receiving the current context and returning a plain value T
 * @returns A function compatible with .andThen() that always succeeds
 *
 * @example
 * ```ts
 * import { ok, bind, let_, Result } from '@hex-di/result';
 *
 * const result = Result.Do
 *   .andThen(bind("user", () => ok({ name: "Alice" })))
 *   .andThen(let_("greeting", ({ user }) => `Hello, ${user.name}`));
 * // => Ok({ user: { name: "Alice" }, greeting: "Hello, Alice" })
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/12-do-notation.md — BEH-12-003
 */
export function let_<N extends string, Ctx extends Record<string, unknown>, T>(
  name: Exclude<N, keyof Ctx>,
  f: (ctx: Ctx) => T,
): (ctx: Ctx) => Result<Ctx & { readonly [K in N]: T }, never> {
  return (ctx: Ctx) => {
    const value = f(ctx);
    return ok({ ...ctx, [name]: value } as Ctx & { readonly [K in N]: T });
  };
}
