/**
 * Config types and error types for unified createAdapter API.
 *
 * This module provides:
 * - Branded error types for factory/class mutual exclusion validation
 * - Config interfaces for factory and class adapter variants
 * - Base config type with shared properties
 *
 * @packageDocumentation
 */

// =============================================================================
// Branded Error Types
// =============================================================================

/**
 * Error type when both factory and class properties are provided.
 *
 * This branded error appears in IDE tooltips when a config object
 * specifies both a factory function and a class constructor.
 *
 * @example
 * ```typescript
 * // Error: config can't have both factory and class
 * createAdapter({
 *   provides: LoggerPort,
 *   factory: () => new ConsoleLogger(),
 *   class: ConsoleLogger  // Type error!
 * });
 * ```
 */
export type BothFactoryAndClassError = {
  readonly __error: "BothFactoryAndClassError";
  readonly __hint: "Provide either 'factory' or 'class', not both. Use 'factory' for custom instantiation logic, 'class' for constructor injection.";
};

/**
 * Error type when neither factory nor class property is provided.
 *
 * This branded error appears in IDE tooltips when a config object
 * specifies neither a factory function nor a class constructor.
 *
 * @example
 * ```typescript
 * // Error: config must have factory or class
 * createAdapter({
 *   provides: LoggerPort,
 *   // No factory or class specified - Type error!
 * });
 * ```
 */
export type NeitherFactoryNorClassError = {
  readonly __error: "NeitherFactoryNorClassError";
  readonly __hint: "Must provide either 'factory' (function that creates instance) or 'class' (constructor for dependency injection).";
};
