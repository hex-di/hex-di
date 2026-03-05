/**
 * Service instance freezing utility.
 *
 * Applies `Object.freeze()` to resolved service instances based on the adapter's
 * `freeze` configuration. When `freeze` is `true` (or omitted, which defaults to `true`),
 * the instance is shallow-frozen before being returned to consumers.
 *
 * This prevents capability tampering where one consumer modifies a shared singleton
 * or scoped service instance.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * Conditionally applies `Object.freeze()` to a resolved service instance.
 *
 * Skips freezing if:
 * - The adapter's `freeze` config is `false`
 * - The instance is `null` or `undefined` (error cases)
 * - The instance is a primitive (already immutable)
 *
 * @param instance - The resolved service instance
 * @param freeze - The adapter's freeze configuration
 * @returns The (possibly frozen) instance
 *
 * @internal
 */
export function maybeFreezeInstance<T>(instance: T, freeze: boolean): T {
  if (!freeze) {
    return instance;
  }

  // Primitives (string, number, boolean, symbol, bigint) and null/undefined
  // cannot be frozen and don't need to be
  if (instance === null || instance === undefined) {
    return instance;
  }

  const t = typeof instance;
  if (t !== "object" && t !== "function") {
    return instance;
  }

  return Object.freeze(instance);
}
