import type { Port } from "@hex-di/ports";

/**
 * Checks if a type is `never`.
 *
 * Uses the tuple wrapping technique `[T] extends [never]` to prevent
 * conditional type distribution over `never`, which would incorrectly
 * return `never` instead of `true`.
 *
 * @typeParam T - The type to check
 * @returns `true` if T is `never`, `false` otherwise
 *
 * @example
 * ```typescript
 * type A = IsNever<never>;    // true
 * type B = IsNever<string>;   // false
 * type C = IsNever<undefined>; // false
 * ```
 *
 * @internal
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Converts a tuple/array type to a union of its element types.
 *
 * @typeParam T - A tuple or array type
 * @returns Union of all element types, or `never` for empty array
 *
 * @internal
 */
export type TupleToUnion<T extends readonly Port<unknown, string>[]> = T extends readonly []
  ? never
  : T[number];
