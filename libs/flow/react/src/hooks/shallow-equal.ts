/**
 * Shallow Equality Utility
 *
 * This module provides a shallow equality function for comparing
 * selected values in useSelector hook.
 *
 * @packageDocumentation
 */

/**
 * Compares two values using shallow equality.
 *
 * For primitive values, uses strict equality (===).
 * For objects, compares own enumerable property values using strict equality.
 * For arrays, compares length and each element using strict equality.
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are shallowly equal, false otherwise
 *
 * @example
 * ```typescript
 * shallowEqual(1, 1) // true
 * shallowEqual({ a: 1 }, { a: 1 }) // true (same values)
 * shallowEqual({ a: 1 }, { a: 2 }) // false (different values)
 * shallowEqual({ a: { b: 1 } }, { a: { b: 1 } }) // false (nested objects are different refs)
 * ```
 */
/**
 * Safely retrieves a property value from an object by name using getOwnPropertyDescriptor.
 * Avoids index-signature casts on narrowed `object` types.
 * @internal
 */
function propertyValue(obj: object, key: string): unknown {
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  return desc !== undefined ? desc.value : undefined;
}

export function shallowEqual<T>(a: T, b: T): boolean {
  // Strict equality check handles primitives and same references
  if (Object.is(a, b)) {
    return true;
  }

  // If either is not an object or is null, they're not equal (already checked above)
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  // If only one is an array, they're not equal
  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }

  // Compare object keys and values
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Check all keys from a exist in b with same values
  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is(propertyValue(a, key), propertyValue(b, key))
    ) {
      return false;
    }
  }

  return true;
}
