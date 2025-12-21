
import type { Port } from "@hex-di/ports";

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
