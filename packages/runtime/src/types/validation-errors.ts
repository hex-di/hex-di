/**
 * Validation error types for override builder.
 *
 * This module provides template literal types for compile-time validation errors
 * when building override configurations. Error messages follow GraphBuilder patterns
 * with actionable fix suggestions.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";

/**
 * Extracts port name from a Port type.
 * @internal
 */
type InferPortName<P> = P extends Port<infer TName, unknown> ? TName : never;

/**
 * Converts a union of Port types to a comma-separated string of names.
 * @internal
 */
type PortUnionToString<P extends Port<string, unknown>> = P extends never
  ? "(empty graph)"
  : InferPortName<P>;

/**
 * Error message when attempting to override a port that doesn't exist in the graph.
 *
 * Provides:
 * - The port name that was attempted
 * - Available ports in the graph
 * - Actionable fix suggestion with copy-paste-ready example
 *
 * @typeParam TPortName - The port name that was attempted to override
 * @typeParam TAvailable - Union of available Port types in the graph
 *
 * @example
 * ```typescript
 * type Error = PortNotInGraphError<"UnknownPort", LoggerPort | DatabasePort>;
 * // ERROR[TYPE-01]: Port 'UnknownPort' not found in graph.
 * // Available ports: Logger | Database
 * // Fix: Add adapter for 'UnknownPort' to graph before creating override.
 * // Example:
 * //   const graph = GraphBuilder.create()
 * //     .provide(UnknownAdapter)  // Add the missing adapter
 * //     .build();
 * ```
 */
export type PortNotInGraphError<
  TPortName extends string,
  TAvailable extends Port<string, unknown>,
> = `ERROR[TYPE-01]: Port '${TPortName}' not found in graph.

Available ports: ${PortUnionToString<TAvailable>}

Fix: Add adapter for '${TPortName}' to graph before creating override.

Example:
  const graph = GraphBuilder.create()
    .provide(${TPortName}Adapter)  // Add the missing adapter
    .build();`;

/**
 * Error message when an override adapter has unsatisfied dependencies.
 *
 * Provides:
 * - The port name being overridden
 * - Which dependencies are missing
 * - Actionable fix suggestion with copy-paste-ready example
 *
 * @typeParam TPortName - The port name being overridden
 * @typeParam TMissing - Union of missing dependency Port types
 *
 * @example
 * ```typescript
 * type Error = MissingDependenciesError<"UserService", ConfigPort | LoggerPort>;
 * // ERROR[TYPE-02]: Override adapter for 'UserService' has unsatisfied dependencies.
 * // Missing: Config | Logger
 * // Fix: Ensure all required ports exist in graph or add them before overriding.
 * // Example:
 * //   const graph = GraphBuilder.create()
 * //     .provide(ConfigAdapter)   // Add missing Config dependency
 * //     .provide(LoggerAdapter)   // Add missing Logger dependency
 * //     .provide(UserServiceAdapter)
 * //     .build();
 * ```
 */
export type MissingDependenciesError<
  TPortName extends string,
  TMissing extends Port<string, unknown>,
> = `ERROR[TYPE-02]: Override adapter for '${TPortName}' has unsatisfied dependencies.

Missing: ${PortUnionToString<TMissing>}

Fix: Ensure all required ports exist in graph or add them before overriding.

Example:
  const graph = GraphBuilder.create()
    .provide(${PortUnionToString<TMissing>}Adapter)  // Add missing dependency
    .provide(${TPortName}Adapter)
    .build();`;
