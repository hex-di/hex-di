/**
 * Helper functions for context manipulation in dependency injection.
 *
 * These utilities simplify working with context variables in adapters
 * and services, providing a type-safe way to pass and retrieve values.
 *
 * @packageDocumentation
 */

import type { ContextVariable } from "./variables.js";

/**
 * Creates a context entry that associates a variable with a value.
 *
 * This helper is useful when building context maps to pass to adapters
 * or when configuring services with runtime values.
 *
 * @typeParam T - The type of value stored in the context variable
 * @param variable - The context variable to associate with a value
 * @param value - The value to store
 * @returns An object containing both the variable and its value
 *
 * @example
 * ```typescript
 * const userId = createContextVariable<string>('userId');
 * const timeout = createContextVariable<number>('timeout');
 *
 * const context = new Map([
 *   [userId.id, withContext(userId, 'user-123').value],
 *   [timeout.id, withContext(timeout, 5000).value],
 * ]);
 * ```
 */
export function withContext<T>(
  variable: ContextVariable<T>,
  value: T
): { variable: ContextVariable<T>; value: T } {
  return { variable, value };
}

/**
 * Retrieves a value from a context map using a context variable.
 *
 * If the variable is not present in the context and has a default value,
 * the default is returned. If neither exists, returns undefined.
 *
 * @typeParam T - The type of value stored in the context variable
 * @param context - The context map containing variable values
 * @param variable - The context variable to look up
 * @returns The value from context, the default value, or undefined
 *
 * @example
 * ```typescript
 * const userId = createContextVariable<string>('userId');
 * const context = new Map([[userId.id, 'user-123']]);
 *
 * const id = getContext(context, userId); // 'user-123'
 * ```
 *
 * @example
 * With default values:
 * ```typescript
 * const retryCount = createContextVariable('retryCount', 3);
 * const emptyContext = new Map();
 *
 * const retries = getContext(emptyContext, retryCount) ?? retryCount.defaultValue; // 3
 * ```
 */
export function getContext<T>(
  context: Map<symbol, unknown>,
  variable: ContextVariable<T>
): T | undefined {
  const value = context.get(variable.id);
  if (value !== undefined) {
    return value as T;
  }
  return variable.defaultValue;
}
