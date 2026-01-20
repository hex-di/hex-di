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
 * "ERROR: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call, or use .override() for child graphs."
 * ```
 */
export type DuplicateErrorMessage<DuplicatePort> =
  `ERROR: Duplicate adapter for '${InferPortName<DuplicatePort> & string}'. Fix: Remove one .provide() call, or use .override() for child graphs.`;

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
 * "ERROR: Circular dependency: UserService -> Database -> Cache -> UserService. Fix: Break cycle by extracting shared logic, using lazy resolution, or inverting a dependency."
 * ```
 */
export type CircularErrorMessage<CyclePath extends string> =
  `ERROR: Circular dependency: ${CyclePath}. Fix: Break cycle by extracting shared logic, using lazy resolution, or inverting a dependency.`;

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
 * "ERROR: Captive dependency: Singleton 'UserCache' cannot depend on Scoped 'RequestContext'. Fix: Change 'UserCache' to Scoped/Transient, or change 'RequestContext' to Singleton."
 * ```
 */
export type CaptiveErrorMessage<
  TDependentName extends string,
  TDependentLifetime extends string,
  TCaptivePortName extends string,
  TCaptiveLifetime extends string,
> = `ERROR: Captive dependency: ${TDependentLifetime} '${TDependentName}' cannot depend on ${TCaptiveLifetime} '${TCaptivePortName}'. Fix: Change '${TDependentName}' to ${TCaptiveLifetime}/Transient, or change '${TCaptivePortName}' to ${TDependentLifetime}.`;

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
 * "ERROR: Lifetime inconsistency for 'Logger': Graph A provides Singleton, Graph B provides Scoped. Fix: Use the same lifetime in both graphs, or remove one adapter before merging."
 * ```
 */
export type LifetimeInconsistencyErrorMessage<
  TPortName extends string,
  TLifetimeA extends string,
  TLifetimeB extends string,
> = `ERROR: Lifetime inconsistency for '${TPortName}': Graph A provides ${TLifetimeA}, Graph B provides ${TLifetimeB}. Fix: Use the same lifetime in both graphs, or remove one adapter before merging.`;

// =============================================================================
// Multi-Error Reporting Types
// =============================================================================
//
// These types enable reporting ALL validation errors at once, rather than
// short-circuiting on the first error. This is useful for:
//
// 1. Seeing all problems at once during development
// 2. CI/CD pipelines that want comprehensive error reports
// 3. IDE tooling that wants to show all issues
//
// This is the default behavior of `provide()`. Use `provideFast()` if you
// prefer short-circuit behavior (stops at first error) for faster type checking.
//

/**
 * Filters `never` values from a tuple type.
 *
 * Used by `CollectValidationErrors` to remove passing validations from the
 * error tuple, leaving only actual errors.
 *
 * @typeParam T - A readonly tuple that may contain `never` values
 * @returns A tuple with all `never` values removed
 *
 * @example
 * ```typescript
 * type Errors = FilterNever<readonly [never, "Error 1", never, "Error 2"]>;
 * // readonly ["Error 1", "Error 2"]
 * ```
 */
export type FilterNever<T extends readonly unknown[]> = T extends readonly [
  infer First,
  ...infer Rest,
]
  ? [First] extends [never]
    ? FilterNever<Rest>
    : readonly [First, ...FilterNever<Rest>]
  : readonly [];

/**
 * Joins multiple error strings with newline separators.
 *
 * @typeParam Errors - A tuple of error message strings
 * @typeParam Acc - Accumulator for the joined result
 * @returns A single string with errors joined by newlines
 *
 * @example
 * ```typescript
 * type Joined = JoinErrors<readonly ["Error 1", "Error 2"]>;
 * // "  1. Error 1\n  2. Error 2"
 * ```
 */
export type JoinErrors<
  Errors extends readonly string[],
  Acc extends string = "",
  N extends readonly unknown[] = readonly [unknown],
> = Errors extends readonly [infer First extends string, ...infer Rest extends readonly string[]]
  ? JoinErrors<
      Rest,
      Acc extends "" ? `  ${N["length"]}. ${First}` : `${Acc}\n  ${N["length"]}. ${First}`,
      readonly [...N, unknown]
    >
  : Acc;

/**
 * Formats multiple validation errors into a single readable message.
 *
 * When there are zero errors, returns `never` (validation passed).
 * When there is one error, returns that error directly.
 * When there are multiple errors, returns a numbered list.
 *
 * @typeParam Errors - A tuple of error message strings (after filtering never)
 *
 * @example Single error (returned as-is)
 * ```typescript
 * type Single = MultiErrorMessage<readonly ["ERROR: Duplicate adapter for 'Logger'."]>;
 * // "ERROR: Duplicate adapter for 'Logger'."
 * ```
 *
 * @example Multiple errors (numbered list)
 * ```typescript
 * type Multiple = MultiErrorMessage<readonly [
 *   "ERROR: Duplicate adapter for 'Logger'.",
 *   "ERROR: Circular dependency: A -> B -> A."
 * ]>;
 * // "Multiple validation errors:\n  1. ERROR: Duplicate...\n  2. ERROR: Circular..."
 * ```
 */
export type MultiErrorMessage<Errors extends readonly string[]> = Errors["length"] extends 0
  ? never
  : Errors["length"] extends 1
    ? Errors[0]
    : `Multiple validation errors:\n${JoinErrors<Errors>}`;

// =============================================================================
// Structured Error Codes
// =============================================================================
//
// These constants provide machine-readable error codes for programmatic
// error handling. Use these when parsing error messages or building tooling.
//
// Note: Error codes are embedded in template literal error messages using
// a consistent format: `ERROR[CODE]: Description...`
//

/**
 * Structured error codes for validation errors.
 *
 * These codes enable programmatic error handling without parsing error
 * message text. Each code corresponds to a specific validation failure type.
 *
 * @example Checking error types
 * ```typescript
 * const inspection = builder.inspect();
 * for (const suggestion of inspection.suggestions) {
 *   if (suggestion.type === 'missing_adapter') {
 *     // Handle MISSING_DEPENDENCY errors
 *   }
 * }
 * ```
 *
 * @example Building tooling
 * ```typescript
 * import { GraphErrorCode, isGraphError, parseGraphError } from '@hex-di/graph';
 *
 * function handleError(message: string) {
 *   const parsed = parseGraphError(message);
 *   if (parsed) {
 *     switch (parsed.code) {
 *       case GraphErrorCode.CIRCULAR_DEPENDENCY:
 *         highlightCycle(parsed.details);
 *         break;
 *       case GraphErrorCode.CAPTIVE_DEPENDENCY:
 *         suggestLifetimeChange(parsed.details);
 *         break;
 *     }
 *   }
 * }
 * ```
 */
export const GraphErrorCode = {
  /** A port has multiple adapters providing it */
  DUPLICATE_ADAPTER: "DUPLICATE_ADAPTER",
  /** Dependencies form a cycle (A -> B -> A) */
  CIRCULAR_DEPENDENCY: "CIRCULAR_DEPENDENCY",
  /** A longer-lived service depends on a shorter-lived one */
  CAPTIVE_DEPENDENCY: "CAPTIVE_DEPENDENCY",
  /** Required dependencies are not provided */
  MISSING_DEPENDENCY: "MISSING_DEPENDENCY",
  /** Merging graphs with same port but different lifetimes */
  LIFETIME_INCONSISTENCY: "LIFETIME_INCONSISTENCY",
  /** Overriding a port not provided by parent graph */
  INVALID_OVERRIDE: "INVALID_OVERRIDE",
  /** Multiple validation errors occurred */
  MULTIPLE_ERRORS: "MULTIPLE_ERRORS",
} as const;

/**
 * Union type of all graph error codes.
 */
export type GraphErrorCodeType = (typeof GraphErrorCode)[keyof typeof GraphErrorCode];

/**
 * Parsed error information from a graph error message.
 */
export interface ParsedGraphError {
  /** The error code identifying the type of error */
  readonly code: GraphErrorCodeType;
  /** The original error message */
  readonly message: string;
  /** Error-specific details extracted from the message */
  readonly details: Readonly<Record<string, string>>;
}

/**
 * Checks if a string is a graph validation error message.
 *
 * @param message - The string to check
 * @returns `true` if the message starts with "ERROR:" or "Multiple validation errors:"
 *
 * @example
 * ```typescript
 * if (isGraphError(result)) {
 *   console.error('Validation failed:', result);
 * }
 * ```
 */
export function isGraphError(message: string): boolean {
  return message.startsWith("ERROR:") || message.startsWith("Multiple validation errors:");
}

/**
 * Parses a graph error message into structured information.
 *
 * @param message - The error message to parse
 * @returns Parsed error info, or `undefined` if not a valid graph error
 *
 * @example
 * ```typescript
 * const error = "ERROR: Duplicate adapter for 'Logger'. Fix: ...";
 * const parsed = parseGraphError(error);
 * // { code: 'DUPLICATE_ADAPTER', message: error, details: { portName: 'Logger' } }
 * ```
 */
export function parseGraphError(message: string): ParsedGraphError | undefined {
  if (!isGraphError(message)) {
    return undefined;
  }

  // Multiple errors
  if (message.startsWith("Multiple validation errors:")) {
    return {
      code: GraphErrorCode.MULTIPLE_ERRORS,
      message,
      details: {},
    };
  }

  // Duplicate adapter
  const duplicateMatch = message.match(/ERROR: Duplicate adapter for '([^']+)'/);
  if (duplicateMatch) {
    return {
      code: GraphErrorCode.DUPLICATE_ADAPTER,
      message,
      details: { portName: duplicateMatch[1] },
    };
  }

  // Circular dependency
  const circularMatch = message.match(/ERROR: Circular dependency: (.+?)\. Fix:/);
  if (circularMatch) {
    return {
      code: GraphErrorCode.CIRCULAR_DEPENDENCY,
      message,
      details: { cyclePath: circularMatch[1] },
    };
  }

  // Captive dependency
  const captiveMatch = message.match(
    /ERROR: Captive dependency: (\w+) '([^']+)' cannot depend on (\w+) '([^']+)'/
  );
  if (captiveMatch) {
    return {
      code: GraphErrorCode.CAPTIVE_DEPENDENCY,
      message,
      details: {
        dependentLifetime: captiveMatch[1],
        dependentName: captiveMatch[2],
        captiveLifetime: captiveMatch[3],
        captiveName: captiveMatch[4],
      },
    };
  }

  // Missing dependency
  const missingMatch = message.match(/ERROR: Missing adapters? for ([^.]+)\./);
  if (missingMatch) {
    return {
      code: GraphErrorCode.MISSING_DEPENDENCY,
      message,
      details: { missingPorts: missingMatch[1] },
    };
  }

  // Lifetime inconsistency
  const lifetimeMatch = message.match(
    /ERROR: Lifetime inconsistency for '([^']+)': Graph A provides (\w+), Graph B provides (\w+)/
  );
  if (lifetimeMatch) {
    return {
      code: GraphErrorCode.LIFETIME_INCONSISTENCY,
      message,
      details: {
        portName: lifetimeMatch[1],
        lifetimeA: lifetimeMatch[2],
        lifetimeB: lifetimeMatch[3],
      },
    };
  }

  // Invalid override
  const overrideMatch = message.match(/ERROR: Cannot override '([^']+)' - port not provided/);
  if (overrideMatch) {
    return {
      code: GraphErrorCode.INVALID_OVERRIDE,
      message,
      details: { portName: overrideMatch[1] },
    };
  }

  // Unknown error format
  return undefined;
}
