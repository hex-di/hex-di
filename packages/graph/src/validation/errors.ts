/**
 * Compile-Time Error Types for @hex-di/graph.
 *
 * This module provides two categories of error types:
 *
 * ## 1. Branded Error Objects
 *
 * Types like `MissingDependencyError` and `DuplicateProviderError` return
 * object types with branded properties (`__valid`, `__errorBrand`, etc.).
 * These are useful for programmatic type narrowing but produce verbose
 * TypeScript error messages.
 *
 * ## 2. Template Literal Error Messages (Preferred)
 *
 * Types like `DuplicateErrorMessage` and `CircularErrorMessage` return
 * plain string literals. When the return type of a method is a string
 * like `"ERROR: Circular dependency: A -> B -> A"`, the IDE displays
 * this message directly on hover, making debugging much easier.
 *
 * ## Design Decision
 *
 * The GraphBuilder API uses **template literal error messages** because:
 * - They appear directly in IDE tooltips
 * - They're immediately readable without expanding type details
 * - They include relevant context (port names, cycle paths)
 *
 * The branded error types are kept for:
 * - Advanced use cases requiring type narrowing
 * - Backwards compatibility
 * - Potential future programmatic error handling
 *
 * @packageDocumentation
 */

import type { Port, InferPortName } from "@hex-di/ports";

/**
 * Extracts port names from a union of Port types for readable error messages.
 *
 * @typeParam TPorts - Union of Port types
 *
 * @remarks
 * This type uses distributive conditional types to iterate over a union
 * of ports and extract each port's name. The result is a union of string
 * literals that can be embedded in template literal error messages.
 *
 * The `[TPorts] extends [never]` check handles the empty union case.
 *
 * @example
 * ```typescript
 * type Names = ExtractPortNames<LoggerPort | DatabasePort>;
 * // Result: "Logger" | "Database"
 * ```
 *
 * @internal
 */
export type ExtractPortNames<TPorts> = [TPorts] extends [never]
  ? never
  : TPorts extends Port<unknown, infer Name>
    ? Name
    : never;

/**
 * A branded error type that produces a readable compile-time error message
 * when dependencies are missing in the graph.
 *
 * @typeParam MissingPorts - Union of Port types that are required but not provided
 *
 * @internal
 */
export type MissingDependencyError<MissingPorts> = [MissingPorts] extends [never]
  ? never
  : {
      readonly __valid: false;
      readonly __errorBrand: "MissingDependencyError";
      readonly __message: `Missing dependencies: ${ExtractPortNames<MissingPorts>}`;
      readonly __missing: MissingPorts;
    };

/**
 * Creates a readable compile-time error message for missing dependencies.
 * Used as the parameter type in build() when dependencies are unsatisfied.
 *
 * This produces clearer TypeScript errors like:
 * "Argument of type '[]' is not assignable to parameter of type
 *  '[MISSING_DEPENDENCIES: "Cannot build: Missing adapters for Logger"]'"
 *
 * @typeParam MissingPorts - Union of Port types that are required but not provided
 */
export type BuildErrorMessage<MissingPorts> = [MissingPorts] extends [never]
  ? never
  : `Cannot build: Missing adapters for ${ExtractPortNames<MissingPorts>}`;

/**
 * A branded error type that produces a readable compile-time error message
 * when a duplicate provider is detected for a port.
 *
 * @typeParam DuplicatePort - The Port type that has a duplicate provider
 */
export type DuplicateProviderError<DuplicatePort> = {
  readonly __valid: false;
  readonly __errorBrand: "DuplicateProviderError";
  readonly __message: `Duplicate provider for: ${InferPortName<DuplicatePort>}`;
  readonly __duplicate: DuplicatePort;
};

/**
 * A branded error type that produces a readable compile-time error message
 * when attempting to override a port that does not exist in the parent container.
 *
 * @typeParam TPort - The Port type that is not found in the parent
 */
export type OverridePortNotFoundError<TPort> = {
  readonly __valid: false;
  readonly __errorBrand: "OverridePortNotFoundError";
  readonly __message: `Port not found in parent: ${InferPortName<TPort>}`;
  readonly __port: TPort;
};

// =============================================================================
// Template Literal Error Messages
// =============================================================================
//
// WHY TEMPLATE LITERALS?
//
// TypeScript 4.1+ introduced template literal types, which allow string
// concatenation at the type level. When a function returns a template literal
// type, the IDE displays the resolved string in tooltips and error messages.
//
// COMPARISON:
//
// Branded object error:
//   "Type 'GraphBuilder<...>' is not assignable to type
//    '{ __valid: false; __errorBrand: "DuplicateProviderError"; ... }'"
//
// Template literal error:
//   "Type 'GraphBuilder<...>' is not assignable to type
//    'ERROR: Duplicate adapter for Logger. Already provided.'"
//
// The template literal version is immediately actionable!
//

/**
 * Template literal error message for duplicate adapter detection.
 *
 * @typeParam DuplicatePort - The port that was already provided
 *
 * @remarks
 * Uses `InferPortName` to extract the readable port name from the port type.
 * The resulting string literal appears directly in IDE error messages.
 *
 * @example
 * When you try to provide LoggerPort twice:
 * ```
 * "ERROR: Duplicate adapter for Logger. Already provided."
 * ```
 */
export type DuplicateErrorMessage<DuplicatePort> =
  `ERROR: Duplicate adapter for ${InferPortName<DuplicatePort>}. Already provided.`;

/**
 * Template literal error message for circular dependency detection.
 *
 * @typeParam CyclePath - A string showing the cycle (e.g., "A -> B -> C -> A")
 *
 * @remarks
 * The `CyclePath` is computed by the `BuildCyclePath` type in cycle-detection.ts,
 * which traverses the dependency graph to construct a human-readable path.
 *
 * @example
 * When UserService -> Database -> Cache -> UserService:
 * ```
 * "ERROR: Circular dependency: UserService -> Database -> Cache -> UserService"
 * ```
 */
export type CircularErrorMessage<CyclePath extends string> =
  `ERROR: Circular dependency: ${CyclePath}`;

/**
 * Template literal error message for captive dependency detection.
 *
 * @typeParam TDependentName - Name of the adapter being added
 * @typeParam TDependentLifetime - Lifetime of the adapter being added (e.g., "Singleton")
 * @typeParam TCaptivePortName - Name of the dependency that would be captured
 * @typeParam TCaptiveLifetime - Lifetime of the captured dependency (e.g., "Scoped")
 *
 * @remarks
 * A "captive dependency" occurs when a longer-lived service holds a reference
 * to a shorter-lived service. For example, a Singleton holding a Scoped service
 * would "capture" the scoped instance, preventing proper per-request behavior.
 *
 * @example
 * When a Singleton tries to depend on a Scoped service:
 * ```
 * "ERROR: Captive dependency: Singleton 'UserCache' cannot depend on Scoped 'RequestContext'"
 * ```
 */
export type CaptiveErrorMessage<
  TDependentName extends string,
  TDependentLifetime extends string,
  TCaptivePortName extends string,
  TCaptiveLifetime extends string,
> = `ERROR: Captive dependency: ${TDependentLifetime} '${TDependentName}' cannot depend on ${TCaptiveLifetime} '${TCaptivePortName}'`;
