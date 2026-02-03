/**
 * Context variable types and factory functions.
 *
 * Context variables enable type-safe dependency injection scenarios
 * where configuration or runtime values need to be passed through
 * the dependency graph.
 *
 * @packageDocumentation
 */

/**
 * A type-safe context variable that can be used to store and retrieve
 * values in a dependency injection context.
 *
 * @typeParam T - The type of value stored in this context variable
 *
 * @example
 * ```typescript
 * const requestId = createContextVariable<string>('requestId');
 * const timeout = createContextVariable('timeout', 5000);
 * ```
 */
export interface ContextVariable<T> {
  /**
   * Unique identifier for this context variable.
   * Using a Symbol ensures variables with the same name don't collide.
   */
  readonly id: symbol;

  /**
   * Optional default value when the context variable is not set.
   */
  readonly defaultValue?: T;
}

/**
 * Creates a new context variable with the given name and optional default value.
 *
 * @typeParam T - The type of value this context variable will hold
 * @param name - Human-readable name for debugging (appears in Symbol description)
 * @param defaultValue - Optional default value when context is not set
 * @returns A new context variable
 *
 * @example
 * ```typescript
 * // Simple context variable
 * const userId = createContextVariable<string>('userId');
 *
 * // Context variable with default
 * const retryCount = createContextVariable('retryCount', 3);
 * ```
 */
export function createContextVariable<T>(name: string, defaultValue?: T): ContextVariable<T> {
  return {
    id: Symbol(name),
    defaultValue,
  };
}
