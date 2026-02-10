/**
 * Structural sharing (replaceEqualDeep).
 *
 * Preserves reference equality for unchanged portions of a data tree,
 * minimizing unnecessary re-renders in React and other reactive frameworks.
 *
 * @packageDocumentation
 */

/**
 * BRAND_CAST: Single documented coercion point for generic algorithms.
 * Used at algorithm boundaries where the generic type T is preserved by
 * structural construction but cannot be proven to TypeScript.
 * All call sites must ensure the value structurally matches T.
 */
function coercePreservedStructure<T>(value: unknown): T;
function coercePreservedStructure(value: unknown): unknown {
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Deep comparison that reuses previous references where possible.
 *
 * Returns `prev` (by reference) for any sub-tree that is structurally equal,
 * and `next` values only where changes exist.
 */
export function replaceEqualDeep<T>(prev: T, next: T): T {
  // Referential equality -- nothing to do
  if (prev === next) return prev;

  // Handle null/undefined differences
  if (prev === null || next === null || prev === undefined || next === undefined) {
    return next;
  }

  // Both arrays
  if (Array.isArray(prev) && Array.isArray(next)) {
    const prevArr: unknown[] = prev;
    const result = next.map((item: unknown, i: number) =>
      i < prevArr.length ? replaceEqualDeep(prevArr[i], item) : item
    );
    if (result.length === prevArr.length && result.every((item, i) => item === prevArr[i])) {
      return prev;
    }
    // GENERIC_BOUNDARY: structural sharing preserves T shape by construction
    return coercePreservedStructure<T>(result);
  }

  // Both plain objects
  if (isPlainObject(prev) && isPlainObject(next)) {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);

    // Quick check: if key counts differ, they're different
    let allEqual = prevKeys.length === nextKeys.length;

    const result: Record<string, unknown> = {};
    for (const key of nextKeys) {
      if (key in prev) {
        result[key] = replaceEqualDeep(prev[key], next[key]);
        if (result[key] !== prev[key]) {
          allEqual = false;
        }
      } else {
        result[key] = next[key];
        allEqual = false;
      }
    }

    if (allEqual) {
      return prev;
    }
    // GENERIC_BOUNDARY: structural sharing preserves T shape by construction
    return coercePreservedStructure<T>(result);
  }

  // Primitives or different types
  return next;
}
