/**
 * Template Literal Error Messages for @hex-di/graph.
 *
 * This module provides readable compile-time error messages using TypeScript's
 * template literal types. When a function returns a template literal type,
 * the IDE displays the resolved string in tooltips, making errors immediately
 * actionable.
 *
 * ## Why Template Literals?
 *
 * ```
 * // Branded object error:
 * "Type 'GraphBuilder<...>' is not assignable to type
 *  '{ __valid: false; __errorBrand: "DuplicateProviderError"; ... }'"
 *
 * // Template literal error:
 * "Type 'GraphBuilder<...>' is not assignable to type
 *  'ERROR: Duplicate adapter for Logger. Already provided.'"
 * ```
 *
 * The template literal version is immediately readable!
 *
 * @packageDocumentation
 */

import type { Port, InferPortName } from "@hex-di/core";
import type { FormatLazySuggestionMessage } from "./cycle/errors.js";
import type { DefaultMaxDepth } from "./cycle/depth.js";
import type {
  CaptiveDependencyError,
  ReverseCaptiveDependencyError,
  MalformedAdapterError,
  ForwardReferenceMarker,
} from "./captive/errors.js";
// InferenceError is available for future use if needed to replace never in error contexts
// import type { InferenceError } from "../../types/type-utilities.js";

// =============================================================================
// Port Name Extraction
// =============================================================================

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
  : TPorts extends Port<infer Name, unknown>
    ? Name
    : never;

/**
 * Helper type that extracts one member from a union (the first in declaration order).
 * Used internally by JoinPortNames to iterate over union members non-distributively.
 *
 * @internal
 */
type UnionToIntersectionFn<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

/**
 * Extracts the "last" member of a union type.
 * This is used to pick one member at a time for non-distributive union iteration.
 *
 * @internal
 */
type LastOfUnion<U> =
  UnionToIntersectionFn<U extends unknown ? (x: U) => void : never> extends (x: infer L) => void
    ? L
    : never;

/**
 * Maximum depth for JoinPortNames iteration.
 * Prevents TypeScript from hitting hard recursion limits with malformed input.
 * 100 ports is far more than any realistic DI graph would have.
 *
 * @internal
 */
type JoinPortNamesMaxDepth = 100;

/**
 * Depth counter for JoinPortNames.
 * Uses tuple length to track recursion depth.
 *
 * @internal
 */
type JoinPortNamesDepth<D extends unknown[] = []> = D["length"] extends JoinPortNamesMaxDepth
  ? true
  : false;

/**
 * Joins port names from a union of Port types into a comma-separated string.
 *
 * @typeParam T - Union of Port types
 * @typeParam Acc - Accumulator string (internal use)
 * @typeParam Depth - Recursion depth counter (internal use)
 *
 * @remarks
 * Unlike `ExtractPortNames` which returns a union of names, this type produces
 * a single comma-separated string. This is used in error messages to show all
 * missing ports at once instead of producing multiple union members.
 *
 * Uses the union-to-tuple trick via `LastOfUnion` to iterate over union members
 * one at a time without distribution.
 *
 * Includes a depth counter (max 100) to prevent TypeScript from hitting hard
 * recursion limits with malformed input. 100 ports is far more than any
 * realistic DI graph would have.
 *
 * @example Single port
 * ```typescript
 * type Result = JoinPortNames<LoggerPort>;
 * // Result: "Logger"
 * ```
 *
 * @example Multiple ports
 * ```typescript
 * type Result = JoinPortNames<LoggerPort | DatabasePort>;
 * // Result: "Logger, Database"  (or "Database, Logger" depending on order)
 * ```
 *
 * @example Never case
 * ```typescript
 * type Result = JoinPortNames<never>;
 * // Result: ""
 * ```
 *
 * @internal
 */
export type JoinPortNames<T, Acc extends string = "", Depth extends unknown[] = []> =
  JoinPortNamesDepth<Depth> extends true
    ? `${Acc}...(truncated: depth limit reached)` // Truncate when recursion depth limit (100) is reached
    : [T] extends [never]
      ? Acc
      : LastOfUnion<T> extends Port<infer N extends string, unknown>
        ? JoinPortNames<
            Exclude<T, LastOfUnion<T>>,
            [Acc] extends [""] ? N : `${Acc}, ${N}`,
            [...Depth, unknown]
          >
        : Acc;

// =============================================================================
// Branded Error Types (Legacy)
// =============================================================================

/**
 * A branded error type that produces a readable compile-time error message
 * when dependencies are missing in the graph.
 *
 * @typeParam MissingPorts - Union of Port types that are required but not provided
 *
 * @remarks
 * Uses `JoinPortNames` instead of `ExtractPortNames` to produce a SINGLE error
 * message with all missing ports listed together, rather than a union of separate
 * messages (which would show only one random port to the user).
 *
 * @internal
 */
export type MissingDependencyError<MissingPorts> = [MissingPorts] extends [never]
  ? never
  : {
      readonly __valid: false;
      readonly __errorBrand: "MissingDependencyError";
      readonly __message: `Missing dependencies: ${JoinPortNames<MissingPorts>}`;
      readonly __missing: MissingPorts;
    };

/**
 * A branded error type that produces a readable compile-time error message
 * when a duplicate provider is detected for a port.
 *
 * @typeParam DuplicatePort - The Port type that has a duplicate provider
 */
export type DuplicateProviderError<DuplicatePort> = {
  readonly __valid: false;
  readonly __errorBrand: "DuplicateProviderError";
  readonly __message: `Duplicate provider for: ${InferPortName<DuplicatePort> & string}`;
  readonly __duplicate: DuplicatePort;
};

// =============================================================================
// Template Literal Error Messages
// =============================================================================

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
 * "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call, or use .override() for child graphs."
 * ```
 */
export type DuplicateErrorMessage<DuplicatePort> =
  `ERROR[HEX001]: Duplicate adapter for '${InferPortName<DuplicatePort> & string}'. Fix: Remove one .provide() call, or use .override() for child graphs.`;

/**
 * Template literal error message for circular dependency detection.
 *
 * @typeParam CyclePath - A string showing the cycle (e.g., "A -> B -> C -> A")
 *
 * @remarks
 * The `CyclePath` is computed by the `BuildCyclePath` type in cycle-detection.ts,
 * which traverses the dependency graph to construct a human-readable path.
 *
 * The error message includes actionable suggestions for breaking the cycle
 * using lazy resolution via `lazyPort()`.
 *
 * @example
 * When UserService -> Database -> Cache -> UserService:
 * ```
 * "ERROR[HEX002]: Circular dependency: UserService -> Database -> Cache -> UserService. Fix: Use lazyPort(Database) in UserServiceAdapter, or lazyPort(Cache) in DatabaseAdapter, or lazyPort(UserService) in CacheAdapter."
 * ```
 */
export type CircularErrorMessage<CyclePath extends string> =
  `ERROR[HEX002]: Circular dependency: ${CyclePath}. Fix: ${FormatLazySuggestionMessage<CyclePath> extends "" ? "Break cycle by extracting shared logic, using lazy resolution, or inverting a dependency." : FormatLazySuggestionMessage<CyclePath>}`;

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
 * "ERROR[HEX003]: Captive dependency: Singleton 'UserCache' cannot depend on Scoped 'RequestContext'. Fix: Change 'UserCache' to Scoped/Transient, or change 'RequestContext' to Singleton."
 * ```
 */
export type CaptiveErrorMessage<
  TDependentName extends string,
  TDependentLifetime extends string,
  TCaptivePortName extends string,
  TCaptiveLifetime extends string,
> = `ERROR[HEX003]: Captive dependency: ${TDependentLifetime} '${TDependentName}' cannot depend on ${TCaptiveLifetime} '${TCaptivePortName}'. Fix: Change '${TDependentName}' to ${TCaptiveLifetime}/Transient, or change '${TCaptivePortName}' to ${TDependentLifetime}.`;

/**
 * Template literal error message for reverse captive dependency detection.
 *
 * @typeParam TExistingName - Name of the existing adapter with longer lifetime
 * @typeParam TExistingLifetime - Lifetime of the existing adapter (e.g., "Singleton")
 * @typeParam TNewPortName - Name of the new port being added with shorter lifetime
 * @typeParam TNewLifetime - Lifetime of the new adapter (e.g., "Scoped")
 *
 * @remarks
 * A "reverse captive dependency" occurs when adding a new adapter that provides
 * a port with a shorter lifetime, but an EXISTING adapter with a longer lifetime
 * already requires that port.
 *
 * This catches the case where adapters are registered in "requirements-first" order:
 * 1. Singleton A is registered requiring Port B (forward reference, not yet in map)
 * 2. Scoped B is registered providing Port B → ERROR: A would capture B
 *
 * @example
 * When a Singleton adapter already requires a port now being provided as Scoped:
 * ```
 * "ERROR[HEX004]: Reverse captive dependency: Existing Singleton 'UserCache' would capture new Scoped 'RequestContext'. Fix: Change 'UserCache' to Scoped/Transient, or change 'RequestContext' to Singleton."
 * ```
 */
export type ReverseCaptiveErrorMessage<
  TExistingName extends string,
  TExistingLifetime extends string,
  TNewPortName extends string,
  TNewLifetime extends string,
> = `ERROR[HEX004]: Reverse captive dependency: Existing ${TExistingLifetime} '${TExistingName}' would capture new ${TNewLifetime} '${TNewPortName}'. Fix: Change '${TExistingName}' to ${TNewLifetime}/Transient, or change '${TNewPortName}' to ${TExistingLifetime}.`;

/**
 * Template literal error message for lifetime inconsistency during merge.
 *
 * @typeParam TPortName - Name of the port with inconsistent lifetimes
 * @typeParam TLifetimeA - Lifetime in the first graph (e.g., "Singleton")
 * @typeParam TLifetimeB - Lifetime in the second graph (e.g., "Scoped")
 *
 * @remarks
 * This error occurs when merging two graphs that both provide the same port
 * but with different lifetimes. For example, Graph A provides Logger as a
 * Singleton, but Graph B provides Logger as Scoped.
 *
 * @example
 * When merging graphs with conflicting lifetimes:
 * ```
 * "ERROR[HEX005]: Lifetime inconsistency for 'Logger': Graph A provides Singleton, Graph B provides Scoped. Fix: Use the same lifetime in both graphs, or remove one adapter before merging."
 * ```
 */
export type LifetimeInconsistencyErrorMessage<
  TPortName extends string,
  TLifetimeA extends string,
  TLifetimeB extends string,
> = `ERROR[HEX005]: Lifetime inconsistency for '${TPortName}': Graph A provides ${TLifetimeA}, Graph B provides ${TLifetimeB}. Fix: Use the same lifetime in both graphs, or remove one adapter before merging.`;

/**
 * Template literal error message for self-dependency detection.
 *
 * @typeParam TPortName - Name of the port that has a self-dependency
 *
 * @remarks
 * A "self-dependency" occurs when an adapter requires its own port. This is
 * always an error because a service cannot exist before it's created.
 *
 * This error is distinct from a circular dependency because it doesn't require
 * traversing the dependency graph - it's detectable immediately from the
 * adapter's own `provides` and `requires` properties.
 *
 * @example
 * When an adapter requires its own port:
 * ```
 * "ERROR[HEX006]: Self-dependency detected. Adapter for 'UserService' requires its own port. Fix: Remove 'UserService' from the requires array, or extract the shared logic into a separate service."
 * ```
 */
export type SelfDependencyErrorMessage<TPortName extends string> =
  `ERROR[HEX006]: Self-dependency detected. Adapter for '${TPortName}' requires its own port. Fix: Remove '${TPortName}' from the requires array, or extract the shared logic into a separate service.`;

// =============================================================================
// Type-Level Warnings
// =============================================================================

/**
 * Template literal warning message for depth limit exceeded.
 *
 * @typeParam TMaxDepth - The configured maximum depth that was exceeded
 * @typeParam TLastPort - The port being processed when depth limit was hit (for debugging)
 *
 * @remarks
 * This warning is generated when the type-level cycle detection algorithm
 * exceeds its configured maximum depth AND the user has opted into unsafe
 * depth override mode via `GraphBuilder.withExtendedDepth()`.
 *
 * In this mode, depth-exceeded is a warning because the user has explicitly
 * acknowledged that they accept incomplete validation.
 *
 * ## Port Provenance (TLastPort)
 *
 * The `TLastPort` parameter tracks which port was being processed when the depth
 * limit was reached. This helps developers understand:
 * 1. Where in the dependency chain the traversal stopped
 * 2. Which port's dependencies need review
 * 3. Whether the depth is legitimate or indicates a design issue
 *
 * @example
 * When depth limit is exceeded with unsafe override:
 * ```
 * "WARNING[HEX007]: Type-level depth limit (50) exceeded at 'DeepService' during cycle detection. Validation may be incomplete. Fix: Use GraphBuilder.withMaxDepth<N>() to increase limit, or restructure graph to reduce depth."
 * ```
 */
export type DepthLimitWarning<
  TMaxDepth extends number = DefaultMaxDepth,
  TLastPort extends string = "unknown",
> = `WARNING[HEX007]: Type-level depth limit (${TMaxDepth}) exceeded at '${TLastPort}' during cycle detection. Validation may be incomplete. Fix: Use GraphBuilder.withMaxDepth<N>() to increase limit, or restructure graph to reduce depth.`;

/**
 * Template literal error message for depth limit exceeded.
 *
 * @typeParam TMaxDepth - The configured maximum depth that was exceeded
 * @typeParam TLastPort - The port being processed when depth limit was hit (for debugging)
 *
 * @remarks
 * This error is generated when the type-level cycle detection algorithm
 * exceeds its configured maximum depth. This is an ERROR by default because
 * it means cycle detection is incomplete, breaking the guarantee that
 * "if types say valid, it is valid".
 *
 * To suppress this error and allow builds to proceed with incomplete
 * validation, use `GraphBuilder.withExtendedDepth()` which converts
 * this error to a warning.
 *
 * ## Port Provenance (TLastPort)
 *
 * The `TLastPort` parameter tracks which port was being processed when the depth
 * limit was reached. This helps developers understand:
 * 1. Where in the dependency chain the traversal stopped
 * 2. Which port's dependencies need review
 * 3. Whether the depth is legitimate or indicates a design issue
 *
 * @example
 * When depth limit is exceeded (default behavior):
 * ```
 * "ERROR[HEX007]: Type-level depth limit (50) exceeded at 'DeepService' - cycle detection incomplete. Fix: Use GraphBuilder.withMaxDepth<N>() to increase limit (max 100), restructure graph, or use GraphBuilder.withExtendedDepth() to acknowledge incomplete validation."
 * ```
 */
export type DepthLimitError<
  TMaxDepth extends number = DefaultMaxDepth,
  TLastPort extends string = "unknown",
> = `ERROR[HEX007]: Type-level depth limit (${TMaxDepth}) exceeded at '${TLastPort}' - cycle detection incomplete. Fix: Use GraphBuilder.withMaxDepth<N>() to increase limit (max 100), restructure graph, or use GraphBuilder.withExtendedDepth() to acknowledge incomplete validation.`;

/**
 * Branded type that indicates the depth limit was exceeded during validation.
 *
 * This type can be inspected via the debug types to check if the depth limit
 * was exceeded during a provide() operation.
 *
 * @typeParam TMaxDepth - The configured maximum depth that was exceeded
 * @typeParam TLastPort - The port being processed when depth limit was hit
 *
 * @internal
 */
export type DepthLimitExceededMarker<
  TMaxDepth extends number = DefaultMaxDepth,
  TLastPort extends string = "unknown",
> = {
  readonly __depthLimitExceeded: true;
  readonly __maxDepth: TMaxDepth;
  readonly __lastPort: TLastPort;
  readonly __warning: DepthLimitWarning<TMaxDepth, TLastPort>;
};

/**
 * Template literal error message for override() called without forParent().
 *
 * @remarks
 * This error occurs when `override()` is called on a GraphBuilder that was
 * created with `.create()` instead of `.forParent(parentGraph)`. Without
 * a parent graph reference, there's nothing to override.
 *
 * ## Common Mistake
 *
 * ```typescript
 * // WRONG: override() on a root graph (no parent)
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .override(MockLoggerAdapter);  // ERROR[HEX009]
 *
 * // RIGHT: override() on a child graph (has parent)
 * const childGraph = GraphBuilder.forParent(parentGraph)
 *   .override(MockLoggerAdapter);  // OK - overrides parent's LoggerAdapter
 *
 * // RIGHT: provide() on root graph (no override needed)
 * const graph = GraphBuilder.create()
 *   .provide(MockLoggerAdapter);  // OK - use provide() for root graphs
 * ```
 *
 * @example
 * When calling override without forParent:
 * ```
 * "ERROR[HEX009]: Cannot use override() without forParent(). This method is only valid for child graphs. Fix: (1) For child containers, use GraphBuilder.forParent(parentGraph).override(adapter); (2) For root containers, use .provide() instead - there's nothing to override."
 * ```
 */
export type OverrideWithoutParentErrorMessage =
  `ERROR[HEX009]: Cannot use override() without forParent(). This method is only valid for child graphs. Fix: (1) For child containers, use GraphBuilder.forParent(parentGraph).override(adapter); (2) For root containers, use .provide() instead - there's nothing to override.`;

/**
 * Template literal error message for invalid lifetime value.
 *
 * @remarks
 * This error occurs when an adapter has a lifetime value that is not one
 * of the valid literals: 'singleton', 'scoped', or 'transient'.
 *
 * Note: Uses HEX015 to match runtime INVALID_LIFETIME_VALUE in error-parsing.ts.
 *
 * @example
 * When an adapter has an invalid lifetime:
 * ```
 * "ERROR[HEX015]: Invalid lifetime value. Expected 'singleton', 'scoped', or 'transient'."
 * ```
 */
export type InvalidLifetimeErrorMessage =
  `ERROR[HEX015]: Invalid lifetime value. Expected 'singleton', 'scoped', or 'transient'.`;

/**
 * Template literal error message for malformed adapter detection.
 *
 * @remarks
 * This error occurs when an adapter has an invalid or missing structure,
 * particularly when the 'lifetime' property is missing or has an invalid value.
 * This was previously returning opaque `never` types; now returns a clear message.
 *
 * ## Why HEX020?
 *
 * Error codes HEX001-HEX019 are allocated in error-parsing.ts for runtime errors.
 * HEX020 is the first type-level-only error code. Type-level error messages
 * that have runtime equivalents should use the same code (e.g., HEX007 for
 * depth limit). Type-level-only errors like this one get new codes starting at HEX020.
 *
 * Reference: See error-parsing.ts GraphErrorNumericCode for authoritative code allocation.
 *
 * @example
 * When an adapter is missing the lifetime property:
 * ```
 * "ERROR[HEX020]: Malformed adapter configuration. Missing or invalid 'lifetime' property. Verify the adapter was created using createAdapter()."
 * ```
 */
/**
 * Creates a MalformedAdapterErrorMessage, optionally including port provenance.
 *
 * @typeParam TPortName - Optional port name for debugging. Defaults to "unknown".
 */
export type MalformedAdapterErrorMessage<TPortName extends string = "unknown"> =
  TPortName extends "unknown"
    ? `ERROR[HEX020]: Malformed adapter configuration. Missing or invalid 'lifetime' property. Verify the adapter was created using createAdapter().`
    : `ERROR[HEX020]: Malformed adapter for '${TPortName}'. Missing or invalid 'lifetime' property. Verify the adapter was created using createAdapter().`;

/**
 * Template literal error message for unexpected internal errors.
 *
 * This error should never occur in normal usage. If seen, it indicates a bug
 * in the type system or an unexpected input that bypassed validation.
 *
 * @typeParam TSource - The name of the type utility that encountered the error
 * @typeParam TExpected - Description of what was expected
 *
 * @remarks
 * Uses HEX022 since HEX020 is for malformed adapters and HEX021 is for override
 * type mismatches.
 *
 * @example
 * ```typescript
 * type Error = UnexpectedInternalErrorMessage<"HandleForwardCaptiveResult", "never, false, or error type">;
 * // "ERROR[HEX022]: Internal type error in 'HandleForwardCaptiveResult'. Expected: never, false, or error type. This is a bug - please report."
 * ```
 */
export type UnexpectedInternalErrorMessage<
  TSource extends string,
  TExpected extends string,
> = `ERROR[HEX022]: Internal type error in '${TSource}'. Expected: ${TExpected}. This is a bug - please report.`;

// =============================================================================
// Captive Result Handlers
// =============================================================================

/**
 * Handles forward captive dependency check results.
 *
 * This type encapsulates the repeated pattern of checking captive dependency
 * results in the correct order:
 * 1. MalformedAdapterError (must be checked FIRST)
 * 2. CaptiveDependencyError (extract params → produce error message)
 * 3. Success case (return the provided success type)
 *
 * ## Why Check MalformedAdapterError First?
 *
 * `never extends CaptiveDependencyError<...>` is always true, which would
 * incorrectly produce `CaptiveErrorMessage<never, never, never, never>`.
 * Since `MalformedAdapterError` is NOT `never`, we can distinguish it by
 * checking it first.
 *
 * @typeParam TResult - The result from WouldAnyBeCaptive or similar check
 * @typeParam TSuccess - The type to return if no error is detected
 *
 * @example
 * ```typescript
 * type Handled = HandleForwardCaptiveResult<
 *   WouldAnyBeCaptive<LifetimeMap, Adapters>,
 *   GraphBuilder<...>
 * >;
 * ```
 */
export type HandleForwardCaptiveResult<TResult, TSuccess> =
  // Handle never case first (no error detected = success)
  [TResult] extends [never]
    ? TSuccess
    : // Handle false case (WouldAnyBeCaptive returns false for successful validation)
      TResult extends false
      ? TSuccess
      : // Handle ForwardReferenceMarker (deferred validation = treat as success)
        // Forward references indicate the port hasn't been registered yet.
        // Validation will occur when the port is actually registered.
        TResult extends ForwardReferenceMarker<string>
        ? TSuccess
        : TResult extends MalformedAdapterError<string>
          ? MalformedAdapterErrorMessage
          : TResult extends CaptiveDependencyError<infer DN, infer DL, infer CP, infer CL>
            ? CaptiveErrorMessage<DN, DL, CP, CL>
            : UnexpectedInternalErrorMessage<
                "HandleForwardCaptiveResult",
                "never, false, ForwardReferenceMarker, MalformedAdapterError, or CaptiveDependencyError"
              >;

/**
 * Handles reverse captive dependency check results.
 *
 * This type encapsulates the repeated pattern of checking reverse captive
 * dependency results in the correct order:
 * 1. MalformedAdapterError (must be checked FIRST)
 * 2. ReverseCaptiveDependencyError (extract params → produce error message)
 * 3. Success case (return the provided success type)
 *
 * ## Why Check MalformedAdapterError First?
 *
 * Same reason as HandleForwardCaptiveResult: `never extends ReverseCaptiveDependencyError<...>`
 * is always true, so we must check MalformedAdapterError first to avoid
 * incorrect error messages.
 *
 * @typeParam TResult - The result from WouldAnyCreateReverseCaptive or similar check
 * @typeParam TSuccess - The type to return if no error is detected
 *
 * @example
 * ```typescript
 * type Handled = HandleReverseCaptiveResult<
 *   WouldAnyCreateReverseCaptive<DepGraph, LifetimeMap, Adapters>,
 *   GraphBuilder<...>
 * >;
 * ```
 */
export type HandleReverseCaptiveResult<TResult, TSuccess> =
  // Handle never case first (no error detected = success)
  [TResult] extends [never]
    ? TSuccess
    : // Handle false case (WouldAnyCreateReverseCaptive returns false for successful validation)
      TResult extends false
      ? TSuccess
      : // Handle ForwardReferenceMarker (deferred validation = treat as success)
        // Forward references indicate the port hasn't been registered yet.
        // Validation will occur when the port is actually registered.
        TResult extends ForwardReferenceMarker<string>
        ? TSuccess
        : TResult extends MalformedAdapterError<string>
          ? MalformedAdapterErrorMessage
          : TResult extends ReverseCaptiveDependencyError<infer EN, infer EL, infer NP, infer NL>
            ? ReverseCaptiveErrorMessage<EN, EL, NP, NL>
            : UnexpectedInternalErrorMessage<
                "HandleReverseCaptiveResult",
                "never, false, ForwardReferenceMarker, MalformedAdapterError, or ReverseCaptiveDependencyError"
              >;
