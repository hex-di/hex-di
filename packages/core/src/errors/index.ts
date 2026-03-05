/**
 * Errors Module
 *
 * Provides error codes, error classes, error parsing utilities, and
 * blame-aware error context for HexDI.
 *
 * @packageDocumentation
 */

// Error codes
export { NumericErrorCode, ErrorCode } from "./codes.js";
export type { NumericErrorCodeType, ErrorCodeType } from "./codes.js";

// Base error class
export { ContainerError, extractErrorMessage, hasMessageProperty } from "./base.js";

// Blame context
export type { BlameContext, BlameViolationType } from "./blame.js";
export { createBlameContext } from "./blame.js";

// Blame-enhanced error formatting
export { formatBlameError } from "./formatting.js";

// Concrete error classes
export {
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  NonClonableForkedError,
} from "./classes.js";

// Resolution error union
export type { ResolutionError } from "./resolution-error.js";
export { isResolutionError, toResolutionError } from "./resolution-error.js";

// Error parsing
export { isHexError, parseError } from "./parsing.js";

// Error types
export type {
  ParsedError,
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
} from "./types.js";
