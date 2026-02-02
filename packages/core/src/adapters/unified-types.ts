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

/**
 * Branded error type for async factories with non-singleton lifetime.
 *
 * This type is returned in the lifetime position when an async factory
 * attempts to use 'scoped' or 'transient' lifetime, producing a compile error.
 * The error message is a template literal that includes the problematic lifetime.
 *
 * @typeParam L - The invalid lifetime that was specified
 *
 * @example
 * ```typescript
 * // This produces a compile error with a clear message:
 * createAdapter({
 *   provides: MyPort,
 *   lifetime: 'scoped',  // Error!
 *   factory: async () => new MyService()
 * });
 * // adapter.lifetime is: "Async factories must use 'singleton' lifetime. Got: 'scoped'. ..."
 * ```
 */
export type AsyncLifetimeError<L extends string> =
  `Async factories must use 'singleton' lifetime. Got: '${L}'. Hint: Remove the lifetime property to use the default, or make the factory synchronous.`;

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Detects if a factory function returns a Promise (async factory).
 *
 * @typeParam TFactory - The factory function type to check
 * @returns `true` if factory returns Promise, `false` otherwise
 *
 * @remarks
 * Special handling for `never` return type: Functions that always throw
 * return `never`, which is a subtype of everything including Promise.
 * We exclude `never` explicitly to avoid treating throwing factories as async.
 */
export type IsAsyncFactory<TFactory> = TFactory extends (...args: never[]) => infer R
  ? [R] extends [never]
    ? false // Throwing factories (return never) are not async
    : R extends Promise<unknown>
      ? true
      : false
  : false;

/**
 * Computes the allowed return type for a factory based on lifetime.
 *
 * When TLifetime is "singleton", allows both sync and async factories.
 * When TLifetime is "scoped" or "transient", only allows sync factories.
 *
 * This is used to constrain the factory type parameter in createAdapter
 * overloads that accept explicit lifetime.
 *
 * @typeParam TService - The service type to return
 * @typeParam TLifetime - The specified lifetime
 *
 * @remarks
 * By constraining the factory return type, TypeScript produces an error
 * at the config level when trying to use async factory with non-singleton.
 */
export type AllowedFactoryReturn<TService, TLifetime extends string> = TLifetime extends "singleton"
  ? TService | Promise<TService>
  : TService; // No Promise for scoped/transient

/**
 * Enforces singleton lifetime for async factories at compile time.
 *
 * When TFactory is async (returns Promise), this type:
 * - Returns TLifetime if it's "singleton"
 * - Returns AsyncLifetimeError<TLifetime> otherwise
 *
 * When TFactory is sync, returns TLifetime unchanged.
 *
 * @typeParam TFactory - The factory function type
 * @typeParam TLifetime - The specified lifetime
 *
 * @remarks
 * This is used in situations where the error needs to appear in the return type.
 * For most cases, prefer using AllowedFactoryReturn to constrain the factory parameter.
 */
export type EnforceAsyncLifetime<TFactory, TLifetime extends string> =
  IsAsyncFactory<TFactory> extends true
    ? TLifetime extends "singleton"
      ? TLifetime
      : AsyncLifetimeError<TLifetime>
    : TLifetime;

// =============================================================================
// Imports
// =============================================================================

import type { Port, InferService } from "../ports/types.js";
import type { Lifetime, ResolvedDeps } from "./types.js";
import type { TupleToUnion } from "../utils/type-utilities.js";

// =============================================================================
// Config Types
// =============================================================================

/**
 * Base config properties shared by both factory and class adapter variants.
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies
 */
export interface BaseUnifiedConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
> {
  /**
   * The port this adapter provides/implements.
   */
  readonly provides: TProvides;

  /**
   * Optional tuple of ports this adapter depends on.
   * Defaults to empty array `[]` at runtime if omitted.
   */
  readonly requires?: TRequires;

  /**
   * Optional lifetime scope for service instances.
   * Defaults to `'singleton'` at runtime if omitted.
   *
   * @remarks
   * For async adapters, lifetime is automatically coerced to 'singleton'
   * regardless of this value (enforced in Phase 10).
   */
  readonly lifetime?: Lifetime;

  /**
   * Optional flag indicating if the service can be safely shallow-cloned.
   * Defaults to `false` at runtime if omitted.
   *
   * @remarks
   * Only mark as true for value-like services with no resource handles
   * (sockets, file handles, etc.) or external references.
   */
  readonly clonable?: boolean;

  /**
   * Optional cleanup function called during disposal.
   *
   * @param instance - The service instance being disposed
   */
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}

/**
 * Factory variant config with factory function.
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TFactory - The factory function type
 */
export interface FactoryConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TFactory extends (
    deps: ResolvedDeps<TupleToUnion<TRequires>>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
> extends BaseUnifiedConfig<TProvides, TRequires> {
  /**
   * Factory function that creates the service instance.
   *
   * @param deps - Object with port names as keys, service instances as values
   * @returns Service instance (sync) or Promise<Service> (async)
   */
  readonly factory: TFactory;

  /**
   * Class constructor is explicitly disallowed in factory variant.
   * This enables mutual exclusion at compile time.
   */
  readonly class?: never;
}

/**
 * Class variant config with class constructor.
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TRequires - Tuple of required port dependencies
 * @typeParam TClass - The class constructor type
 */
export interface ClassConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TClass extends new (...args: unknown[]) => InferService<TProvides>,
> extends BaseUnifiedConfig<TProvides, TRequires> {
  /**
   * Class constructor for dependency injection.
   *
   * @remarks
   * Constructor parameters must match the order of ports in `requires` array.
   * TypeScript cannot verify this ordering - it's the user's responsibility.
   */
  readonly class: TClass;

  /**
   * Factory function is explicitly disallowed in class variant.
   * This enables mutual exclusion at compile time.
   */
  readonly factory?: never;
}
