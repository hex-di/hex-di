/**
 * Left-to-right function composition. Passes `value` through a sequence of
 * functions, threading the output of each into the next.
 *
 * Overloaded for up to 12 type parameters to preserve full type inference.
 *
 * @typeParam A - The type of the initial value.
 * @param value - The initial value.
 * @param fns - Up to 11 functions to compose left-to-right.
 * @returns The result of threading `value` through all functions.
 *
 * @example
 * ```ts
 * import { ok } from '@hex-di/result';
 * import { pipe, map, andThen, unwrapOr } from '@hex-di/result/fn';
 *
 * const result = pipe(
 *   ok(21),
 *   map(n => n * 2),
 *   unwrapOr(0)
 * );
 * // result === 42
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-002}
 */
export function pipe<A>(value: A): A;
export function pipe<A, B>(value: A, f1: (a: A) => B): B;
export function pipe<A, B, C>(value: A, f1: (a: A) => B, f2: (b: B) => C): C;
export function pipe<A, B, C, D>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D): D;
export function pipe<A, B, C, D, E>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E): E;
export function pipe<A, B, C, D, E, F>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F): F;
export function pipe<A, B, C, D, E, F, G>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F, f6: (f: F) => G): G;
export function pipe<A, B, C, D, E, F, G, H>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F, f6: (f: F) => G, f7: (g: G) => H): H;
export function pipe<A, B, C, D, E, F, G, H, I>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F, f6: (f: F) => G, f7: (g: G) => H, f8: (h: H) => I): I;
export function pipe<A, B, C, D, E, F, G, H, I, J>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F, f6: (f: F) => G, f7: (g: G) => H, f8: (h: H) => I, f9: (i: I) => J): J;
export function pipe<A, B, C, D, E, F, G, H, I, J, K>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F, f6: (f: F) => G, f7: (g: G) => H, f8: (h: H) => I, f9: (i: I) => J, f10: (j: J) => K): K;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F, f6: (f: F) => G, f7: (g: G) => H, f8: (h: H) => I, f9: (i: I) => J, f10: (j: J) => K, f11: (k: K) => L): L;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pipe(value: any, ...fns: ((arg: any) => any)[]): any {
  return fns.reduce((acc, fn) => fn(acc), value);
}
