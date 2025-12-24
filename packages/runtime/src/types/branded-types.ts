/**
 * Branded types for type-safe context variable access.
 *
 * These types provide compile-time safety for context variable keys and values,
 * preventing accidental type mismatches when storing and retrieving values.
 *
 * @packageDocumentation
 */

/**
 * A branded type for context variable keys.
 *
 * This type ensures that context variable keys are type-safe and cannot be
 * confused with regular strings. The brand carries the value type at the type level.
 *
 * @typeParam T - The type of value stored under this key
 *
 * @remarks
 * - The brand property exists only at the type level (zero runtime overhead)
 * - Keys are still strings at runtime but have type safety at compile time
 * - Use `createContextVariableKey<T>()` to create branded keys
 *
 * @example
 * ```typescript
 * type UserContextKey = ContextVariableKey<UserContext>;
 * const userKey = createContextVariableKey<UserContext>('user');
 * ```
 */
const CONTEXT_VARIABLE_KEY_BRAND = Symbol("ContextVariableKey");

/**
 * A branded type for context variable keys.
 *
 * This type carries a unique symbol brand and the value type, allowing
 * compile-time safety without runtime overhead.
 */
export interface ContextVariableKey<T = unknown> {
  /**
   * Runtime string representation of the key.
   */
  readonly __key: string;

  /**
   * Internal brand used to carry the type parameter.
   */
  readonly [CONTEXT_VARIABLE_KEY_BRAND]: T;

  /**
   * Provides a string representation for compatibility with string-based APIs.
   */
  toString(): string;
}

class ContextVariableKeyImpl<T> implements ContextVariableKey<T> {
  readonly [CONTEXT_VARIABLE_KEY_BRAND]!: T;

  constructor(readonly __key: string) {}

  toString(): string {
    return this.__key;
  }
}

const contextVariableKeyCache = new Map<string, ContextVariableKey<unknown>>();

/**
 * Creates a branded context variable key with type safety.
 *
 * @typeParam T - The type of value stored under this key
 * @param key - The string key name
 * @returns A branded key that carries type information
 *
 * @remarks
 * This function is a type-safe way to create context variable keys.
 * At runtime, it simply returns an object that delegates to the original string.
 *
 * @example
 * ```typescript
 * interface UserContext {
 *   userId: string;
 *   userName: string;
 * }
 *
 * const userContextKey = createContextVariableKey<UserContext>('userContext');
 * ```
 */
export function createContextVariableKey<T>(key: string): ContextVariableKey<T> {
  const cached = contextVariableKeyCache.get(key);
  if (cached !== undefined) {
    // SAFETY: Context variable cache stores ContextVariableKey<unknown> but returns
    // ContextVariableKey<T>. Sound because the key string is the identity - same key
    // always returns same instance, and T is a phantom type parameter that exists only
    // at the type level. Caller discipline ensures consistent T for each key string.
    return cached as ContextVariableKey<T>;
  }

  const created = new ContextVariableKeyImpl<T>(key);
  // SAFETY: Widening ContextVariableKey<T> to ContextVariableKey<unknown> for cache storage.
  // Sound because T is a phantom type - the runtime representation is identical regardless of T.
  contextVariableKeyCache.set(key, created as ContextVariableKey<unknown>);
  return created;
}
