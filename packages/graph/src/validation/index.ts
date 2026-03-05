/**
 * Validation module - Compile-time graph validation utilities.
 *
 * This module re-exports types from src/types/validation/ for compile-time
 * validation of dependency graphs:
 *
 * - **Error types**: Branded error messages for duplicates, cycles, captive deps
 * - **Cycle detection**: Type-level cycle detection in dependency graphs
 * - **Captive detection**: Detection of lifetime scope violations
 * - **Lazy transforms**: Utilities for lazy port handling
 *
 * All validation happens at compile-time via TypeScript's type system.
 *
 * Error parsing utilities are re-exported from `@hex-di/core` (canonical source)
 * with graph-prefixed aliases for backward compatibility.
 *
 * @packageDocumentation
 */

// Re-export all types from the types/ folder
export * from "./types/index.js";

// Runtime validation utilities
export { checkOperationCompleteness, getPortMethodNames } from "./runtime/index.js";

// =============================================================================
// Re-export Runtime Error Parsing from @hex-di/core (canonical source)
// =============================================================================

export {
  NumericErrorCode as GraphErrorNumericCode,
  ErrorCode as GraphErrorCode,
  isHexError as isGraphError,
  parseError as parseGraphError,
} from "@hex-di/core";

export type {
  NumericErrorCodeType as GraphErrorNumericCodeType,
  ErrorCodeType as GraphErrorCodeType,
  ParsedError as ParsedGraphError,
  // Error detail types for discriminated union narrowing
  DuplicateAdapterDetails,
  CircularDependencyDetails,
  CaptiveDependencyDetails,
  ReverseCaptiveDependencyDetails,
  LifetimeInconsistencyDetails,
  SelfDependencyDetails,
  DepthLimitExceededDetails,
  MissingDependencyDetails,
  OverrideWithoutParentDetails,
  MissingProvidesDetails,
  InvalidProvidesDetails,
  InvalidRequiresTypeDetails,
  InvalidRequiresElementDetails,
  InvalidLifetimeTypeDetails,
  InvalidLifetimeValueDetails,
  InvalidFactoryDetails,
  DuplicateRequiresDetails,
  InvalidFinalizerDetails,
  InvalidLazyPortDetails,
  MultipleErrorsDetails,
  UnknownErrorDetails,
  // Parsed error types for discriminated unions
  ParsedDuplicateAdapterError,
  ParsedCircularDependencyError,
  ParsedCaptiveDependencyError,
  ParsedReverseCaptiveDependencyError,
  ParsedLifetimeInconsistencyError,
  ParsedSelfDependencyError,
  ParsedDepthLimitExceededError,
  ParsedMissingDependencyError,
  ParsedOverrideWithoutParentError,
  ParsedMissingProvidesError,
  ParsedInvalidProvidesError,
  ParsedInvalidRequiresTypeError,
  ParsedInvalidRequiresElementError,
  ParsedInvalidLifetimeTypeError,
  ParsedInvalidLifetimeValueError,
  ParsedInvalidFactoryError,
  ParsedDuplicateRequiresError,
  ParsedInvalidFinalizerError,
  ParsedInvalidLazyPortError,
  ParsedMultipleErrorsError,
  ParsedUnknownErrorError,
} from "@hex-di/core";
