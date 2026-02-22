/**
 * Override builder type definitions.
 *
 * This module provides type-level validation for the override builder,
 * following GraphBuilder's phantom type patterns for compile-time safety.
 *
 * @packageDocumentation
 */

import type {
  Port,
  AdapterConstraint,
  InferAdapterProvides,
  InferAdapterRequires,
} from "@hex-di/core";
import type { PortNotInGraphError, MissingDependenciesError } from "./validation-errors.js";

/**
 * Extracts port name from a Port type.
 * @internal
 */
type InferPortName<P> = P extends Port<infer TName, unknown> ? TName : never;

/**
 * Checks if a port union contains all required ports.
 * @internal
 */
type HasAllPorts<
  TRequired extends Port<string, unknown>,
  TAvailable extends Port<string, unknown>,
> = TRequired extends never ? true : TRequired extends TAvailable ? true : false;

/**
 * Calculates which required ports are missing from available ports.
 * @internal
 */
type UnsatisfiedDependencies<
  TRequired extends Port<string, unknown>,
  TAvailable extends Port<string, unknown>,
> = Exclude<TRequired, TAvailable>;

/**
 * Validates that an adapter's port exists in the graph.
 *
 * This type checks:
 * 1. The adapter's `provides` port exists in `TGraphProvides`
 * 2. If validation passes, returns success type
 * 3. If validation fails, returns descriptive error message
 *
 * @typeParam TGraphProvides - Union of ports provided by the graph
 * @typeParam TAdapter - The adapter being validated
 *
 * @example
 * ```typescript
 * type Result = ValidateOverrideAdapter<LoggerPort | DatabasePort, typeof MockLoggerAdapter>;
 * // If MockLoggerAdapter provides LoggerPort: Success
 * // If MockLoggerAdapter provides UnknownPort: PortNotInGraphError
 * ```
 */
export type ValidateOverrideAdapter<
  TGraphProvides extends Port<string, unknown>,
  TAdapter extends AdapterConstraint,
> =
  InferAdapterProvides<TAdapter> extends TGraphProvides
    ? ValidateAdapterDependencies<TGraphProvides, TAdapter>
    : PortNotInGraphError<InferPortName<InferAdapterProvides<TAdapter>>, TGraphProvides>;

/**
 * Validates that an adapter's required ports are satisfied.
 *
 * This type checks:
 * 1. All ports in adapter's `requires` exist in `TGraphProvides`
 * 2. If all dependencies satisfied, returns adapter (valid)
 * 3. If dependencies missing, returns descriptive error message
 *
 * @typeParam TGraphProvides - Union of ports provided by the graph
 * @typeParam TAdapter - The adapter being validated
 *
 * @example
 * ```typescript
 * type Result = ValidateAdapterDependencies<LoggerPort | DatabasePort, typeof UserServiceAdapter>;
 * // If UserServiceAdapter requires [LoggerPort]: Success
 * // If UserServiceAdapter requires [ConfigPort]: MissingDependenciesError
 * ```
 */
export type ValidateAdapterDependencies<
  TGraphProvides extends Port<string, unknown>,
  TAdapter extends AdapterConstraint,
> =
  HasAllPorts<InferAdapterRequires<TAdapter>, TGraphProvides> extends true
    ? TAdapter
    : MissingDependenciesError<
        InferPortName<InferAdapterProvides<TAdapter>>,
        UnsatisfiedDependencies<InferAdapterRequires<TAdapter>, TGraphProvides>
      >;

/**
 * Phantom type tracking accumulated overrides in the builder.
 *
 * This type tracks the state of overrides being built, following
 * GraphBuilder's type-state pattern with phantom type parameters.
 *
 * @typeParam TProvides - Union of ports from the base graph
 * @typeParam TOverrides - Union of ports that have been overridden
 *
 * @internal
 */
export type OverrideBuilderState<
  TProvides extends Port<string, unknown>,
  TOverrides extends Port<string, unknown> = never,
> = {
  readonly __provides: TProvides;
  readonly __overrides: TOverrides;
};
