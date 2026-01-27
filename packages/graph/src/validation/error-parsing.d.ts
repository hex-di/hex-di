/**
 * Error Parsing Utilities.
 *
 * This module provides runtime utilities for parsing and categorizing
 * graph validation error messages. Use these when building tooling or
 * handling errors programmatically.
 *
 * ## Error Code Format
 *
 * All error messages follow the format: `ERROR[HEXxxx]: Description...`
 *
 * | Code    | Error Type                 |
 * |---------|----------------------------|
 * | HEX001  | Duplicate adapter          |
 * | HEX002  | Circular dependency        |
 * | HEX003  | Captive dependency         |
 * | HEX004  | Reverse captive dependency |
 * | HEX005  | Lifetime inconsistency     |
 * | HEX006  | Self-dependency            |
 * | HEX007  | Depth limit warning        |
 * | HEX008  | Missing dependency         |
 * | HEX009  | Override without parent    |
 * | HEX010  | Missing provides           |
 * | HEX011  | Invalid provides           |
 * | HEX012  | Invalid requires type      |
 * | HEX013  | Invalid requires element   |
 * | HEX014  | Invalid lifetime type      |
 * | HEX015  | Invalid lifetime value     |
 * | HEX016  | Invalid factory            |
 * | HEX017  | Duplicate requires         |
 * | HEX018  | Invalid finalizer          |
 * | HEX019  | Invalid lazy port          |
 *
 * @packageDocumentation
 */
/**
 * Numeric error codes for machine-readable error identification.
 *
 * These codes are embedded in error messages using the format `ERROR[HEXxxx]:`.
 * Use these constants when parsing error messages or building tooling.
 *
 * @example Parsing error codes
 * ```typescript
 * const message = "ERROR[HEX001]: Duplicate adapter for 'Logger'.";
 * const match = message.match(/ERROR\[HEX(\d{3})\]/);
 * if (match && match[1] === '001') {
 *   console.log('Duplicate adapter error');
 * }
 * ```
 */
export declare const GraphErrorNumericCode: {
    /** HEX001: A port has multiple adapters providing it */
    readonly DUPLICATE_ADAPTER: "HEX001";
    /** HEX002: Dependencies form a cycle (A -> B -> A) */
    readonly CIRCULAR_DEPENDENCY: "HEX002";
    /** HEX003: A longer-lived service depends on a shorter-lived one */
    readonly CAPTIVE_DEPENDENCY: "HEX003";
    /** HEX004: A later-registered adapter creates a captive dependency with an existing adapter */
    readonly REVERSE_CAPTIVE_DEPENDENCY: "HEX004";
    /** HEX005: Merging graphs with same port but different lifetimes */
    readonly LIFETIME_INCONSISTENCY: "HEX005";
    /** HEX006: An adapter requires its own port */
    readonly SELF_DEPENDENCY: "HEX006";
    /** HEX007: Type-level depth limit exceeded during validation */
    readonly DEPTH_LIMIT_EXCEEDED: "HEX007";
    /** HEX008: Required dependencies are not provided */
    readonly MISSING_DEPENDENCY: "HEX008";
    /** HEX009: override() called without forParent() */
    readonly OVERRIDE_WITHOUT_PARENT: "HEX009";
    /** HEX010: Adapter config missing 'provides' field */
    readonly MISSING_PROVIDES: "HEX010";
    /** HEX011: Adapter config 'provides' is not a valid Port */
    readonly INVALID_PROVIDES: "HEX011";
    /** HEX012: Adapter config 'requires' is not an array */
    readonly INVALID_REQUIRES_TYPE: "HEX012";
    /** HEX013: Adapter config 'requires' element is not a valid Port */
    readonly INVALID_REQUIRES_ELEMENT: "HEX013";
    /** HEX014: Adapter config 'lifetime' is not a string */
    readonly INVALID_LIFETIME_TYPE: "HEX014";
    /** HEX015: Adapter config 'lifetime' is not a valid value */
    readonly INVALID_LIFETIME_VALUE: "HEX015";
    /** HEX016: Adapter config 'factory' is not a function */
    readonly INVALID_FACTORY: "HEX016";
    /** HEX017: Adapter config 'requires' has duplicate ports */
    readonly DUPLICATE_REQUIRES: "HEX017";
    /** HEX018: Adapter config 'finalizer' is not a function */
    readonly INVALID_FINALIZER: "HEX018";
    /** HEX019: Invalid lazy port (missing original port reference) */
    readonly INVALID_LAZY_PORT: "HEX019";
};
/**
 * Union type of all numeric error codes.
 */
export type GraphErrorNumericCodeType = (typeof GraphErrorNumericCode)[keyof typeof GraphErrorNumericCode];
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
export declare const GraphErrorCode: {
    /** A port has multiple adapters providing it */
    readonly DUPLICATE_ADAPTER: "DUPLICATE_ADAPTER";
    /** Dependencies form a cycle (A -> B -> A) */
    readonly CIRCULAR_DEPENDENCY: "CIRCULAR_DEPENDENCY";
    /** A longer-lived service depends on a shorter-lived one */
    readonly CAPTIVE_DEPENDENCY: "CAPTIVE_DEPENDENCY";
    /** A later-registered adapter creates a captive dependency with an existing adapter */
    readonly REVERSE_CAPTIVE_DEPENDENCY: "REVERSE_CAPTIVE_DEPENDENCY";
    /** Merging graphs with same port but different lifetimes */
    readonly LIFETIME_INCONSISTENCY: "LIFETIME_INCONSISTENCY";
    /** An adapter requires its own port */
    readonly SELF_DEPENDENCY: "SELF_DEPENDENCY";
    /** Type-level depth limit exceeded during validation (warning) */
    readonly DEPTH_LIMIT_EXCEEDED: "DEPTH_LIMIT_EXCEEDED";
    /** Required dependencies are not provided (runtime build error) */
    readonly MISSING_DEPENDENCY: "MISSING_DEPENDENCY";
    /** override() called without forParent() */
    readonly OVERRIDE_WITHOUT_PARENT: "OVERRIDE_WITHOUT_PARENT";
    /** Multiple validation errors occurred */
    readonly MULTIPLE_ERRORS: "MULTIPLE_ERRORS";
    /** Adapter config missing 'provides' field */
    readonly MISSING_PROVIDES: "MISSING_PROVIDES";
    /** Adapter config 'provides' is not a valid Port */
    readonly INVALID_PROVIDES: "INVALID_PROVIDES";
    /** Adapter config 'requires' is not an array */
    readonly INVALID_REQUIRES_TYPE: "INVALID_REQUIRES_TYPE";
    /** Adapter config 'requires' element is not a valid Port */
    readonly INVALID_REQUIRES_ELEMENT: "INVALID_REQUIRES_ELEMENT";
    /** Adapter config 'lifetime' is not a string */
    readonly INVALID_LIFETIME_TYPE: "INVALID_LIFETIME_TYPE";
    /** Adapter config 'lifetime' is not a valid value */
    readonly INVALID_LIFETIME_VALUE: "INVALID_LIFETIME_VALUE";
    /** Adapter config 'factory' is not a function */
    readonly INVALID_FACTORY: "INVALID_FACTORY";
    /** Adapter config 'requires' has duplicate ports */
    readonly DUPLICATE_REQUIRES: "DUPLICATE_REQUIRES";
    /** Adapter config 'finalizer' is not a function */
    readonly INVALID_FINALIZER: "INVALID_FINALIZER";
    /** Invalid lazy port (missing original port reference) */
    readonly INVALID_LAZY_PORT: "INVALID_LAZY_PORT";
    /** Unrecognized error format that matches HEX pattern but has no specific handler */
    readonly UNKNOWN_ERROR: "UNKNOWN_ERROR";
};
/**
 * Union type of all graph error codes.
 */
export type GraphErrorCodeType = (typeof GraphErrorCode)[keyof typeof GraphErrorCode];
/**
 * Details for DUPLICATE_ADAPTER (HEX001) errors.
 */
export interface DuplicateAdapterDetails {
    readonly portName: string;
}
/**
 * Details for CIRCULAR_DEPENDENCY (HEX002) errors.
 * cyclePath may be absent in simple runtime format.
 */
export interface CircularDependencyDetails {
    readonly cyclePath?: string;
}
/**
 * Details for CAPTIVE_DEPENDENCY (HEX003) errors.
 * All fields may be absent in simple runtime format.
 */
export interface CaptiveDependencyDetails {
    readonly dependentLifetime?: string;
    readonly dependentName?: string;
    readonly captiveLifetime?: string;
    readonly captiveName?: string;
}
/**
 * Details for REVERSE_CAPTIVE_DEPENDENCY (HEX004) errors.
 */
export interface ReverseCaptiveDependencyDetails {
    readonly existingLifetime: string;
    readonly existingName: string;
    readonly newLifetime: string;
    readonly newName: string;
}
/**
 * Details for LIFETIME_INCONSISTENCY (HEX005) errors.
 */
export interface LifetimeInconsistencyDetails {
    readonly portName: string;
    readonly lifetimeA: string;
    readonly lifetimeB: string;
}
/**
 * Details for SELF_DEPENDENCY (HEX006) errors.
 */
export interface SelfDependencyDetails {
    readonly portName: string;
}
/**
 * Details for DEPTH_LIMIT_EXCEEDED (HEX007) warnings.
 */
export interface DepthLimitExceededDetails {
    readonly maxDepth: string;
}
/**
 * Details for MISSING_DEPENDENCY (HEX008) errors.
 */
export interface MissingDependencyDetails {
    readonly missingPorts: string;
}
/**
 * Details for OVERRIDE_WITHOUT_PARENT (HEX009) errors.
 * No additional details.
 */
export interface OverrideWithoutParentDetails {
}
/**
 * Details for MISSING_PROVIDES (HEX010) errors.
 * No additional details.
 */
export interface MissingProvidesDetails {
}
/**
 * Details for INVALID_PROVIDES (HEX011) errors.
 */
export interface InvalidProvidesDetails {
    readonly actualType?: string;
}
/**
 * Details for INVALID_REQUIRES_TYPE (HEX012) errors.
 */
export interface InvalidRequiresTypeDetails {
    readonly actualType?: string;
}
/**
 * Details for INVALID_REQUIRES_ELEMENT (HEX013) errors.
 */
export interface InvalidRequiresElementDetails {
    readonly index: string;
}
/**
 * Details for INVALID_LIFETIME_TYPE (HEX014) errors.
 */
export interface InvalidLifetimeTypeDetails {
    readonly actualType?: string;
}
/**
 * Details for INVALID_LIFETIME_VALUE (HEX015) errors.
 */
export interface InvalidLifetimeValueDetails {
    readonly actualValue?: string;
}
/**
 * Details for INVALID_FACTORY (HEX016) errors.
 */
export interface InvalidFactoryDetails {
    readonly actualType?: string;
}
/**
 * Details for DUPLICATE_REQUIRES (HEX017) errors.
 */
export interface DuplicateRequiresDetails {
    readonly portName: string;
}
/**
 * Details for INVALID_FINALIZER (HEX018) errors.
 */
export interface InvalidFinalizerDetails {
    readonly actualType?: string;
}
/**
 * Details for INVALID_LAZY_PORT (HEX019) errors.
 * No additional details.
 */
export interface InvalidLazyPortDetails {
}
/**
 * Details for MULTIPLE_ERRORS errors.
 */
export interface MultipleErrorsDetails {
    readonly errorCount: string;
    readonly errorCodes: string;
}
/**
 * Details for UNKNOWN_ERROR errors.
 */
export interface UnknownErrorDetails {
    readonly rawMessage: string;
}
/**
 * Parsed DUPLICATE_ADAPTER error.
 */
export interface ParsedDuplicateAdapterError {
    readonly code: typeof GraphErrorCode.DUPLICATE_ADAPTER;
    readonly message: string;
    readonly details: Readonly<DuplicateAdapterDetails>;
}
/**
 * Parsed CIRCULAR_DEPENDENCY error.
 */
export interface ParsedCircularDependencyError {
    readonly code: typeof GraphErrorCode.CIRCULAR_DEPENDENCY;
    readonly message: string;
    readonly details: Readonly<CircularDependencyDetails>;
}
/**
 * Parsed CAPTIVE_DEPENDENCY error.
 */
export interface ParsedCaptiveDependencyError {
    readonly code: typeof GraphErrorCode.CAPTIVE_DEPENDENCY;
    readonly message: string;
    readonly details: Readonly<CaptiveDependencyDetails>;
}
/**
 * Parsed REVERSE_CAPTIVE_DEPENDENCY error.
 */
export interface ParsedReverseCaptiveDependencyError {
    readonly code: typeof GraphErrorCode.REVERSE_CAPTIVE_DEPENDENCY;
    readonly message: string;
    readonly details: Readonly<ReverseCaptiveDependencyDetails>;
}
/**
 * Parsed LIFETIME_INCONSISTENCY error.
 */
export interface ParsedLifetimeInconsistencyError {
    readonly code: typeof GraphErrorCode.LIFETIME_INCONSISTENCY;
    readonly message: string;
    readonly details: Readonly<LifetimeInconsistencyDetails>;
}
/**
 * Parsed SELF_DEPENDENCY error.
 */
export interface ParsedSelfDependencyError {
    readonly code: typeof GraphErrorCode.SELF_DEPENDENCY;
    readonly message: string;
    readonly details: Readonly<SelfDependencyDetails>;
}
/**
 * Parsed DEPTH_LIMIT_EXCEEDED warning.
 */
export interface ParsedDepthLimitExceededError {
    readonly code: typeof GraphErrorCode.DEPTH_LIMIT_EXCEEDED;
    readonly message: string;
    readonly details: Readonly<DepthLimitExceededDetails>;
}
/**
 * Parsed MISSING_DEPENDENCY error.
 */
export interface ParsedMissingDependencyError {
    readonly code: typeof GraphErrorCode.MISSING_DEPENDENCY;
    readonly message: string;
    readonly details: Readonly<MissingDependencyDetails>;
}
/**
 * Parsed OVERRIDE_WITHOUT_PARENT error.
 */
export interface ParsedOverrideWithoutParentError {
    readonly code: typeof GraphErrorCode.OVERRIDE_WITHOUT_PARENT;
    readonly message: string;
    readonly details: Readonly<OverrideWithoutParentDetails>;
}
/**
 * Parsed MISSING_PROVIDES error.
 */
export interface ParsedMissingProvidesError {
    readonly code: typeof GraphErrorCode.MISSING_PROVIDES;
    readonly message: string;
    readonly details: Readonly<MissingProvidesDetails>;
}
/**
 * Parsed INVALID_PROVIDES error.
 */
export interface ParsedInvalidProvidesError {
    readonly code: typeof GraphErrorCode.INVALID_PROVIDES;
    readonly message: string;
    readonly details: Readonly<InvalidProvidesDetails>;
}
/**
 * Parsed INVALID_REQUIRES_TYPE error.
 */
export interface ParsedInvalidRequiresTypeError {
    readonly code: typeof GraphErrorCode.INVALID_REQUIRES_TYPE;
    readonly message: string;
    readonly details: Readonly<InvalidRequiresTypeDetails>;
}
/**
 * Parsed INVALID_REQUIRES_ELEMENT error.
 */
export interface ParsedInvalidRequiresElementError {
    readonly code: typeof GraphErrorCode.INVALID_REQUIRES_ELEMENT;
    readonly message: string;
    readonly details: Readonly<InvalidRequiresElementDetails>;
}
/**
 * Parsed INVALID_LIFETIME_TYPE error.
 */
export interface ParsedInvalidLifetimeTypeError {
    readonly code: typeof GraphErrorCode.INVALID_LIFETIME_TYPE;
    readonly message: string;
    readonly details: Readonly<InvalidLifetimeTypeDetails>;
}
/**
 * Parsed INVALID_LIFETIME_VALUE error.
 */
export interface ParsedInvalidLifetimeValueError {
    readonly code: typeof GraphErrorCode.INVALID_LIFETIME_VALUE;
    readonly message: string;
    readonly details: Readonly<InvalidLifetimeValueDetails>;
}
/**
 * Parsed INVALID_FACTORY error.
 */
export interface ParsedInvalidFactoryError {
    readonly code: typeof GraphErrorCode.INVALID_FACTORY;
    readonly message: string;
    readonly details: Readonly<InvalidFactoryDetails>;
}
/**
 * Parsed DUPLICATE_REQUIRES error.
 */
export interface ParsedDuplicateRequiresError {
    readonly code: typeof GraphErrorCode.DUPLICATE_REQUIRES;
    readonly message: string;
    readonly details: Readonly<DuplicateRequiresDetails>;
}
/**
 * Parsed INVALID_FINALIZER error.
 */
export interface ParsedInvalidFinalizerError {
    readonly code: typeof GraphErrorCode.INVALID_FINALIZER;
    readonly message: string;
    readonly details: Readonly<InvalidFinalizerDetails>;
}
/**
 * Parsed INVALID_LAZY_PORT error.
 */
export interface ParsedInvalidLazyPortError {
    readonly code: typeof GraphErrorCode.INVALID_LAZY_PORT;
    readonly message: string;
    readonly details: Readonly<InvalidLazyPortDetails>;
}
/**
 * Parsed MULTIPLE_ERRORS error.
 */
export interface ParsedMultipleErrorsError {
    readonly code: typeof GraphErrorCode.MULTIPLE_ERRORS;
    readonly message: string;
    readonly details: Readonly<MultipleErrorsDetails>;
}
/**
 * Parsed UNKNOWN_ERROR error.
 */
export interface ParsedUnknownErrorError {
    readonly code: typeof GraphErrorCode.UNKNOWN_ERROR;
    readonly message: string;
    readonly details: Readonly<UnknownErrorDetails>;
}
/**
 * Discriminated union of all parsed graph error types.
 *
 * Use this type when you need type-safe access to error details based on
 * the error code. TypeScript will narrow the `details` type based on the
 * `code` discriminant.
 *
 * @example Type-safe error handling
 * ```typescript
 * const parsed = parseGraphError(message);
 * if (parsed) {
 *   switch (parsed.code) {
 *     case 'DUPLICATE_ADAPTER':
 *       // TypeScript knows parsed.details has portName: string
 *       console.log(`Duplicate adapter for ${parsed.details.portName}`);
 *       break;
 *     case 'CAPTIVE_DEPENDENCY':
 *       // TypeScript knows parsed.details has optional captive fields
 *       if (parsed.details.dependentName) {
 *         console.log(`${parsed.details.dependentName} is captive`);
 *       }
 *       break;
 *   }
 * }
 * ```
 */
export type ParsedGraphError = ParsedDuplicateAdapterError | ParsedCircularDependencyError | ParsedCaptiveDependencyError | ParsedReverseCaptiveDependencyError | ParsedLifetimeInconsistencyError | ParsedSelfDependencyError | ParsedDepthLimitExceededError | ParsedMissingDependencyError | ParsedOverrideWithoutParentError | ParsedMissingProvidesError | ParsedInvalidProvidesError | ParsedInvalidRequiresTypeError | ParsedInvalidRequiresElementError | ParsedInvalidLifetimeTypeError | ParsedInvalidLifetimeValueError | ParsedInvalidFactoryError | ParsedDuplicateRequiresError | ParsedInvalidFinalizerError | ParsedInvalidLazyPortError | ParsedMultipleErrorsError | ParsedUnknownErrorError;
/**
 * Checks if a string is a graph validation error or warning message.
 *
 * @param message - The string to check
 * @returns `true` if the message starts with "ERROR[HEX", "WARNING[HEX", or "Multiple validation errors:"
 *
 * @example
 * ```typescript
 * if (isGraphError(result)) {
 *   console.error('Validation failed:', result);
 * }
 * ```
 */
export declare function isGraphError(message: string): boolean;
/**
 * Parses a graph error message into structured information.
 *
 * @param message - The error message to parse
 * @returns Parsed error info, or `undefined` if not a valid graph error
 *
 * @example
 * ```typescript
 * const error = "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: ...";
 * const parsed = parseGraphError(error);
 * // { code: 'DUPLICATE_ADAPTER', message: error, details: { portName: 'Logger' } }
 * ```
 */
export declare function parseGraphError(message: string): ParsedGraphError | undefined;
