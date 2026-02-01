/**
 * Error detail types for parsed errors.
 *
 * @packageDocumentation
 */

import type { ErrorCode } from "./codes.js";

// =============================================================================
// Error-Specific Detail Types
// =============================================================================

export interface DuplicateAdapterDetails {
  readonly portName: string;
}

export interface CircularDependencyDetails {
  readonly cyclePath?: string;
}

export interface CaptiveDependencyDetails {
  readonly dependentLifetime?: string;
  readonly dependentName?: string;
  readonly captiveLifetime?: string;
  readonly captiveName?: string;
}

export interface ReverseCaptiveDependencyDetails {
  readonly existingLifetime: string;
  readonly existingName: string;
  readonly newLifetime: string;
  readonly newName: string;
}

export interface LifetimeInconsistencyDetails {
  readonly portName: string;
  readonly lifetimeA: string;
  readonly lifetimeB: string;
}

export interface SelfDependencyDetails {
  readonly portName: string;
}

export interface DepthLimitExceededDetails {
  readonly maxDepth: string;
  readonly startPort?: string;
  readonly lastPort?: string;
}

export interface MissingDependencyDetails {
  readonly missingPorts: string;
}

/** Error details for override without parent - no additional details needed */
export type OverrideWithoutParentDetails = Record<string, never>;

/** Error details for missing provides - no additional details needed */
export type MissingProvidesDetails = Record<string, never>;

export interface InvalidProvidesDetails {
  readonly actualType?: string;
}

export interface InvalidRequiresTypeDetails {
  readonly actualType?: string;
}

export interface InvalidRequiresElementDetails {
  readonly index: string;
}

export interface InvalidLifetimeTypeDetails {
  readonly actualType?: string;
}

export interface InvalidLifetimeValueDetails {
  readonly actualValue?: string;
}

export interface InvalidFactoryDetails {
  readonly actualType?: string;
}

export interface DuplicateRequiresDetails {
  readonly portName: string;
}

export interface InvalidFinalizerDetails {
  readonly actualType?: string;
}

/** Error details for invalid lazy port - no additional details needed */
export type InvalidLazyPortDetails = Record<string, never>;

export interface MultipleErrorsDetails {
  readonly errorCount: string;
  readonly errorCodes: string;
}

export interface UnknownErrorDetails {
  readonly rawMessage: string;
}

// =============================================================================
// Parsed Error Interfaces
// =============================================================================

export interface ParsedDuplicateAdapterError {
  readonly code: typeof ErrorCode.DUPLICATE_ADAPTER;
  readonly message: string;
  readonly details: Readonly<DuplicateAdapterDetails>;
}

export interface ParsedCircularDependencyError {
  readonly code: typeof ErrorCode.CIRCULAR_DEPENDENCY;
  readonly message: string;
  readonly details: Readonly<CircularDependencyDetails>;
}

export interface ParsedCaptiveDependencyError {
  readonly code: typeof ErrorCode.CAPTIVE_DEPENDENCY;
  readonly message: string;
  readonly details: Readonly<CaptiveDependencyDetails>;
}

export interface ParsedReverseCaptiveDependencyError {
  readonly code: typeof ErrorCode.REVERSE_CAPTIVE_DEPENDENCY;
  readonly message: string;
  readonly details: Readonly<ReverseCaptiveDependencyDetails>;
}

export interface ParsedLifetimeInconsistencyError {
  readonly code: typeof ErrorCode.LIFETIME_INCONSISTENCY;
  readonly message: string;
  readonly details: Readonly<LifetimeInconsistencyDetails>;
}

export interface ParsedSelfDependencyError {
  readonly code: typeof ErrorCode.SELF_DEPENDENCY;
  readonly message: string;
  readonly details: Readonly<SelfDependencyDetails>;
}

export interface ParsedDepthLimitExceededError {
  readonly code: typeof ErrorCode.DEPTH_LIMIT_EXCEEDED;
  readonly message: string;
  readonly details: Readonly<DepthLimitExceededDetails>;
}

export interface ParsedMissingDependencyError {
  readonly code: typeof ErrorCode.MISSING_DEPENDENCY;
  readonly message: string;
  readonly details: Readonly<MissingDependencyDetails>;
}

export interface ParsedOverrideWithoutParentError {
  readonly code: typeof ErrorCode.OVERRIDE_WITHOUT_PARENT;
  readonly message: string;
  readonly details: Readonly<OverrideWithoutParentDetails>;
}

export interface ParsedMissingProvidesError {
  readonly code: typeof ErrorCode.MISSING_PROVIDES;
  readonly message: string;
  readonly details: Readonly<MissingProvidesDetails>;
}

export interface ParsedInvalidProvidesError {
  readonly code: typeof ErrorCode.INVALID_PROVIDES;
  readonly message: string;
  readonly details: Readonly<InvalidProvidesDetails>;
}

export interface ParsedInvalidRequiresTypeError {
  readonly code: typeof ErrorCode.INVALID_REQUIRES_TYPE;
  readonly message: string;
  readonly details: Readonly<InvalidRequiresTypeDetails>;
}

export interface ParsedInvalidRequiresElementError {
  readonly code: typeof ErrorCode.INVALID_REQUIRES_ELEMENT;
  readonly message: string;
  readonly details: Readonly<InvalidRequiresElementDetails>;
}

export interface ParsedInvalidLifetimeTypeError {
  readonly code: typeof ErrorCode.INVALID_LIFETIME_TYPE;
  readonly message: string;
  readonly details: Readonly<InvalidLifetimeTypeDetails>;
}

export interface ParsedInvalidLifetimeValueError {
  readonly code: typeof ErrorCode.INVALID_LIFETIME_VALUE;
  readonly message: string;
  readonly details: Readonly<InvalidLifetimeValueDetails>;
}

export interface ParsedInvalidFactoryError {
  readonly code: typeof ErrorCode.INVALID_FACTORY;
  readonly message: string;
  readonly details: Readonly<InvalidFactoryDetails>;
}

export interface ParsedDuplicateRequiresError {
  readonly code: typeof ErrorCode.DUPLICATE_REQUIRES;
  readonly message: string;
  readonly details: Readonly<DuplicateRequiresDetails>;
}

export interface ParsedInvalidFinalizerError {
  readonly code: typeof ErrorCode.INVALID_FINALIZER;
  readonly message: string;
  readonly details: Readonly<InvalidFinalizerDetails>;
}

export interface ParsedInvalidLazyPortError {
  readonly code: typeof ErrorCode.INVALID_LAZY_PORT;
  readonly message: string;
  readonly details: Readonly<InvalidLazyPortDetails>;
}

export interface ParsedMultipleErrorsError {
  readonly code: typeof ErrorCode.MULTIPLE_ERRORS;
  readonly message: string;
  readonly details: Readonly<MultipleErrorsDetails>;
}

export interface ParsedUnknownErrorError {
  readonly code: typeof ErrorCode.UNKNOWN_ERROR;
  readonly message: string;
  readonly details: Readonly<UnknownErrorDetails>;
}

/**
 * Discriminated union of all parsed error types.
 *
 * Use this type when you need type-safe access to error details based on
 * the error code. TypeScript will narrow the `details` type based on the
 * `code` discriminant.
 *
 * @example Type-safe error handling
 * ```typescript
 * const parsed = parseError(message);
 * if (parsed) {
 *   switch (parsed.code) {
 *     case 'DUPLICATE_ADAPTER':
 *       console.log(`Duplicate adapter for ${parsed.details.portName}`);
 *       break;
 *     case 'CAPTIVE_DEPENDENCY':
 *       if (parsed.details.dependentName) {
 *         console.log(`${parsed.details.dependentName} is captive`);
 *       }
 *       break;
 *   }
 * }
 * ```
 */
export type ParsedError =
  | ParsedDuplicateAdapterError
  | ParsedCircularDependencyError
  | ParsedCaptiveDependencyError
  | ParsedReverseCaptiveDependencyError
  | ParsedLifetimeInconsistencyError
  | ParsedSelfDependencyError
  | ParsedDepthLimitExceededError
  | ParsedMissingDependencyError
  | ParsedOverrideWithoutParentError
  | ParsedMissingProvidesError
  | ParsedInvalidProvidesError
  | ParsedInvalidRequiresTypeError
  | ParsedInvalidRequiresElementError
  | ParsedInvalidLifetimeTypeError
  | ParsedInvalidLifetimeValueError
  | ParsedInvalidFactoryError
  | ParsedDuplicateRequiresError
  | ParsedInvalidFinalizerError
  | ParsedInvalidLazyPortError
  | ParsedMultipleErrorsError
  | ParsedUnknownErrorError;
