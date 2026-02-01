/**
 * Helper functions for type-safe context variable access and port operations.
 *
 * These functions provide type-safe wrappers around context operations,
 * eliminating the need for unsafe type casts. They work with any context-like
 * object that has get/set methods.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";
import type { ContextVariableKey } from "./branded-types.js";

/**
 * Generic context interface for type-safe variable access.
 * Represents any object with get/set methods for storing and retrieving values.
 */
export interface TypeSafeContext {
  /**
   * Retrieves a typed value from the context by key.
   * @param key - The branded key to retrieve
   * @returns The value stored under the key, or undefined if not found
   */
  get<T>(key: ContextVariableKey<T>): T | undefined;

  /**
   * Stores a typed value in the context under the given key.
   * @param key - The branded key to store under
   * @param value - The typed value to store
   */
  set<T>(key: ContextVariableKey<T>, value: T): void;
}

/**
 * Retrieves a context variable with type safety.
 *
 * This function provides a type-safe way to retrieve values from any context object
 * without requiring unsafe type casts. The return type is inferred from the key's
 * branded type parameter.
 *
 * @typeParam T - The type of value stored under the key
 * @param context - The context object with get/set methods
 * @param key - The branded context variable key
 * @returns The value stored under the key, or undefined if not found
 *
 * @remarks
 * - The return type is automatically inferred from the key's type parameter
 * - No type casting is required - the function is fully type-safe
 * - Returns undefined if the key is not found in the context
 * - Works with any context-like object (Hono Context, custom contexts, etc.)
 *
 * @example
 * ```typescript
 * interface UserContext {
 *   userId: string;
 *   userName: string;
 * }
 *
 * const userContextKey = createContextVariableKey<UserContext>('userContext');
 *
 * const userContext = getContextVariable(context, userContextKey);
 * if (userContext) {
 *   console.log(userContext.userId); // Type-safe access
 * }
 * ```
 */
export function getContextVariable<T>(
  context: TypeSafeContext,
  key: ContextVariableKey<T>
): T | undefined {
  return context.get<T>(key);
}

/**
 * Sets a context variable with type safety.
 *
 * This function provides a type-safe way to store values in any context object
 * without requiring unsafe type casts. The value type is validated against
 * the key's branded type parameter.
 *
 * @typeParam T - The type of value being stored
 * @param context - The context object with get/set methods
 * @param key - The branded context variable key
 * @param value - The value to store (must match the key's type parameter)
 *
 * @remarks
 * - The value type is validated at compile time against the key's type parameter
 * - No type casting is required - the function is fully type-safe
 * - Works with any context-like object (Hono Context, custom contexts, etc.)
 *
 * @example
 * ```typescript
 * interface UserContext {
 *   userId: string;
 *   userName: string;
 * }
 *
 * const userContextKey = createContextVariableKey<UserContext>('userContext');
 *
 * const userContext: UserContext = { userId: '123', userName: 'Alice' };
 * setContextVariable(context, userContextKey, userContext);
 * ```
 */
export function setContextVariable<T>(
  context: TypeSafeContext,
  key: ContextVariableKey<T>,
  value: T
): void {
  context.set<T>(key, value);
}

/**
 * Retrieves a context variable with a fallback value.
 *
 * This function provides a convenient way to retrieve a context variable
 * with a default value if the variable is not found.
 *
 * @typeParam T - The type of value stored under the key
 * @param context - The context object with get/set methods
 * @param key - The branded context variable key
 * @param defaultValue - The value to return if the key is not found
 * @returns The value stored under the key, or the defaultValue if not found
 *
 * @remarks
 * - The return type is guaranteed to be T (not T | undefined)
 * - If defaultValue is provided, the return is never undefined
 * - Works with any context-like object (Hono Context, custom contexts, etc.)
 *
 * @example
 * ```typescript
 * const userContextKey = createContextVariableKey<UserContext>('userContext');
 * const defaultUser: UserContext = { userId: 'guest', userName: 'Guest' };
 *
 * const userContext = getContextVariableOrDefault(context, userContextKey, defaultUser);
 * // userContext is guaranteed to be UserContext (not undefined)
 * ```
 */
export function getContextVariableOrDefault<T>(
  context: TypeSafeContext,
  key: ContextVariableKey<T>,
  defaultValue: T
): T {
  const value = getContextVariable(context, key);
  return value !== undefined ? value : defaultValue;
}

/**
 * Comparator function for sorting ports by name.
 *
 * This function provides a type-safe way to compare ports for sorting operations.
 * It compares ports by their `__portName` property using lexicographic ordering.
 *
 * @param portA - The first port to compare
 * @param portB - The second port to compare
 * @returns A negative number if portA < portB, positive if portA > portB, or 0 if equal
 *
 * @remarks
 * - This function is useful for deterministic ordering of ports during initialization
 * - Ports are compared by their string names using localeCompare for consistent ordering
 * - The comparison is case-sensitive and follows Unicode ordering rules
 *
 * @example
 * ```typescript
 * const ports = [DatabasePort, LoggerPort, CachePort];
 * const sortedPorts = ports.sort(portComparator);
 * // Results in deterministic order: [CachePort, DatabasePort, LoggerPort]
 * ```
 */
export function portComparator(portA: Port<unknown, string>, portB: Port<unknown, string>): number {
  return portA.__portName.localeCompare(portB.__portName);
}
