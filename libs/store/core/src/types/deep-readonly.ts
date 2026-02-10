/**
 * DeepReadonly Type Utility
 *
 * Recursively makes all properties readonly. Functions are preserved as-is.
 *
 * @packageDocumentation
 */

/**
 * Recursively makes all properties of T readonly.
 *
 * - Functions are preserved as-is (no readonly on function properties)
 * - Maps become ReadonlyMaps
 * - Sets become ReadonlySets
 * - Arrays become readonly arrays
 * - Objects have all properties made readonly recursively
 * - Primitives pass through unchanged
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<K, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends readonly (infer U)[]
        ? readonly DeepReadonly<U>[]
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;
