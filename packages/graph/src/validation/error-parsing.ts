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
export const GraphErrorNumericCode = {
  /** HEX001: A port has multiple adapters providing it */
  DUPLICATE_ADAPTER: "HEX001",
  /** HEX002: Dependencies form a cycle (A -> B -> A) */
  CIRCULAR_DEPENDENCY: "HEX002",
  /** HEX003: A longer-lived service depends on a shorter-lived one */
  CAPTIVE_DEPENDENCY: "HEX003",
  /** HEX004: A later-registered adapter creates a captive dependency with an existing adapter */
  REVERSE_CAPTIVE_DEPENDENCY: "HEX004",
  /** HEX005: Merging graphs with same port but different lifetimes */
  LIFETIME_INCONSISTENCY: "HEX005",
  /** HEX006: An adapter requires its own port */
  SELF_DEPENDENCY: "HEX006",
  /** HEX007: Type-level depth limit exceeded during validation */
  DEPTH_LIMIT_EXCEEDED: "HEX007",
  /** HEX008: Required dependencies are not provided */
  MISSING_DEPENDENCY: "HEX008",
  /** HEX009: override() called without forParent() */
  OVERRIDE_WITHOUT_PARENT: "HEX009",
  /** HEX010: Adapter config missing 'provides' field */
  MISSING_PROVIDES: "HEX010",
  /** HEX011: Adapter config 'provides' is not a valid Port */
  INVALID_PROVIDES: "HEX011",
  /** HEX012: Adapter config 'requires' is not an array */
  INVALID_REQUIRES_TYPE: "HEX012",
  /** HEX013: Adapter config 'requires' element is not a valid Port */
  INVALID_REQUIRES_ELEMENT: "HEX013",
  /** HEX014: Adapter config 'lifetime' is not a string */
  INVALID_LIFETIME_TYPE: "HEX014",
  /** HEX015: Adapter config 'lifetime' is not a valid value */
  INVALID_LIFETIME_VALUE: "HEX015",
  /** HEX016: Adapter config 'factory' is not a function */
  INVALID_FACTORY: "HEX016",
  /** HEX017: Adapter config 'requires' has duplicate ports */
  DUPLICATE_REQUIRES: "HEX017",
  /** HEX018: Adapter config 'finalizer' is not a function */
  INVALID_FINALIZER: "HEX018",
  /** HEX019: Invalid lazy port (missing original port reference) */
  INVALID_LAZY_PORT: "HEX019",
} as const;

/**
 * Union type of all numeric error codes.
 */
export type GraphErrorNumericCodeType =
  (typeof GraphErrorNumericCode)[keyof typeof GraphErrorNumericCode];

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
  /** A later-registered adapter creates a captive dependency with an existing adapter */
  REVERSE_CAPTIVE_DEPENDENCY: "REVERSE_CAPTIVE_DEPENDENCY",
  /** Merging graphs with same port but different lifetimes */
  LIFETIME_INCONSISTENCY: "LIFETIME_INCONSISTENCY",
  /** An adapter requires its own port */
  SELF_DEPENDENCY: "SELF_DEPENDENCY",
  /** Type-level depth limit exceeded during validation (warning) */
  DEPTH_LIMIT_EXCEEDED: "DEPTH_LIMIT_EXCEEDED",
  /** Required dependencies are not provided (runtime build error) */
  MISSING_DEPENDENCY: "MISSING_DEPENDENCY",
  /** override() called without forParent() */
  OVERRIDE_WITHOUT_PARENT: "OVERRIDE_WITHOUT_PARENT",
  /** Multiple validation errors occurred */
  MULTIPLE_ERRORS: "MULTIPLE_ERRORS",
  /** Adapter config missing 'provides' field */
  MISSING_PROVIDES: "MISSING_PROVIDES",
  /** Adapter config 'provides' is not a valid Port */
  INVALID_PROVIDES: "INVALID_PROVIDES",
  /** Adapter config 'requires' is not an array */
  INVALID_REQUIRES_TYPE: "INVALID_REQUIRES_TYPE",
  /** Adapter config 'requires' element is not a valid Port */
  INVALID_REQUIRES_ELEMENT: "INVALID_REQUIRES_ELEMENT",
  /** Adapter config 'lifetime' is not a string */
  INVALID_LIFETIME_TYPE: "INVALID_LIFETIME_TYPE",
  /** Adapter config 'lifetime' is not a valid value */
  INVALID_LIFETIME_VALUE: "INVALID_LIFETIME_VALUE",
  /** Adapter config 'factory' is not a function */
  INVALID_FACTORY: "INVALID_FACTORY",
  /** Adapter config 'requires' has duplicate ports */
  DUPLICATE_REQUIRES: "DUPLICATE_REQUIRES",
  /** Adapter config 'finalizer' is not a function */
  INVALID_FINALIZER: "INVALID_FINALIZER",
  /** Invalid lazy port (missing original port reference) */
  INVALID_LAZY_PORT: "INVALID_LAZY_PORT",
  /** Unrecognized error format that matches HEX pattern but has no specific handler */
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

/**
 * Union type of all graph error codes.
 */
export type GraphErrorCodeType = (typeof GraphErrorCode)[keyof typeof GraphErrorCode];

// =============================================================================
// Error-Specific Detail Types (Discriminated Union)
// =============================================================================

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
  /** The port where validation started (if present in message) */
  readonly startPort?: string;
  /** The last port visited when depth limit was hit (if present in message) */
  readonly lastPort?: string;
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
export interface OverrideWithoutParentDetails {}

/**
 * Details for MISSING_PROVIDES (HEX010) errors.
 * No additional details.
 */
export interface MissingProvidesDetails {}

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
export interface InvalidLazyPortDetails {}

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

// =============================================================================
// Discriminated Union for Parsed Errors
// =============================================================================

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
export type ParsedGraphError =
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
export function isGraphError(message: string): boolean {
  return (
    message.startsWith("ERROR[HEX") ||
    message.startsWith("WARNING[HEX") ||
    message.startsWith("Multiple validation errors:")
  );
}

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
export function parseGraphError(message: string): ParsedGraphError | undefined {
  if (!isGraphError(message)) {
    return undefined;
  }

  // Multiple errors
  if (message.startsWith("Multiple validation errors:")) {
    // Extract the individual error codes from the numbered list
    // Format: "Multiple validation errors:\n  1. ERROR[HEX001]: ...\n  2. ERROR[HEX002]: ..."
    const errorCodeMatches = message.matchAll(/ERROR\[HEX(\d{3})\]/g);
    const errorCodes = Array.from(errorCodeMatches, m => `HEX${m[1]}`);
    return {
      code: GraphErrorCode.MULTIPLE_ERRORS,
      message,
      details: {
        errorCount: String(errorCodes.length),
        errorCodes: errorCodes.join(","),
      },
    };
  }

  // Duplicate adapter (HEX001)
  const duplicateMatch = message.match(
    /ERROR\[HEX001\]: Duplicate adapter for '(?<portName>[^']+)'/
  );
  if (duplicateMatch?.groups) {
    return {
      code: GraphErrorCode.DUPLICATE_ADAPTER,
      message,
      details: { portName: duplicateMatch.groups.portName },
    };
  }

  // Circular dependency (HEX002) - type-level format
  const circularMatch = message.match(
    /ERROR\[HEX002\]: Circular dependency: (?<cyclePath>.+?)\. Fix:/
  );
  if (circularMatch?.groups) {
    return {
      code: GraphErrorCode.CIRCULAR_DEPENDENCY,
      message,
      details: { cyclePath: circularMatch.groups.cyclePath },
    };
  }

  // Circular dependency (HEX002) - runtime format
  const circularRuntimeMatch = message.match(
    /ERROR\[HEX002\]: Circular dependency detected at runtime(?: \(depth exceeded type-level limit\))?: (?<cyclePath>.+)/
  );
  if (circularRuntimeMatch?.groups) {
    return {
      code: GraphErrorCode.CIRCULAR_DEPENDENCY,
      message,
      details: { cyclePath: circularRuntimeMatch.groups.cyclePath },
    };
  }

  // Circular dependency (HEX002) - simple runtime format (no cycle path)
  if (message.match(/ERROR\[HEX002\]: Circular dependency detected at runtime/)) {
    return {
      code: GraphErrorCode.CIRCULAR_DEPENDENCY,
      message,
      details: {},
    };
  }

  // Captive dependency (HEX003) - type-level format
  const captiveMatch = message.match(
    /ERROR\[HEX003\]: Captive dependency: (?<dependentLifetime>\w+) '(?<dependentName>[^']+)' cannot depend on (?<captiveLifetime>\w+) '(?<captiveName>[^']+)'/
  );
  if (captiveMatch?.groups) {
    return {
      code: GraphErrorCode.CAPTIVE_DEPENDENCY,
      message,
      details: {
        dependentLifetime: captiveMatch.groups.dependentLifetime,
        dependentName: captiveMatch.groups.dependentName,
        captiveLifetime: captiveMatch.groups.captiveLifetime,
        captiveName: captiveMatch.groups.captiveName,
      },
    };
  }

  // Captive dependency (HEX003) - runtime format
  const captiveRuntimeMatch = message.match(
    /ERROR\[HEX003\]: Captive dependency detected at runtime: (?<dependentLifetime>\w+) '(?<dependentName>[^']+)' cannot depend on (?<captiveLifetime>\w+) '(?<captiveName>[^']+)'/
  );
  if (captiveRuntimeMatch?.groups) {
    return {
      code: GraphErrorCode.CAPTIVE_DEPENDENCY,
      message,
      details: {
        dependentLifetime: captiveRuntimeMatch.groups.dependentLifetime,
        dependentName: captiveRuntimeMatch.groups.dependentName,
        captiveLifetime: captiveRuntimeMatch.groups.captiveLifetime,
        captiveName: captiveRuntimeMatch.groups.captiveName,
      },
    };
  }

  // Captive dependency (HEX003) - simple runtime format (no details)
  if (message.match(/ERROR\[HEX003\]: Captive dependency detected at runtime/)) {
    return {
      code: GraphErrorCode.CAPTIVE_DEPENDENCY,
      message,
      details: {},
    };
  }

  // Reverse captive dependency (HEX004)
  const reverseCaptiveMatch = message.match(
    /ERROR\[HEX004\]: Reverse captive dependency: Existing (?<existingLifetime>\w+) '(?<existingName>[^']+)' would capture new (?<newLifetime>\w+) '(?<newName>[^']+)'/
  );
  if (reverseCaptiveMatch?.groups) {
    return {
      code: GraphErrorCode.REVERSE_CAPTIVE_DEPENDENCY,
      message,
      details: {
        existingLifetime: reverseCaptiveMatch.groups.existingLifetime,
        existingName: reverseCaptiveMatch.groups.existingName,
        newLifetime: reverseCaptiveMatch.groups.newLifetime,
        newName: reverseCaptiveMatch.groups.newName,
      },
    };
  }

  // Lifetime inconsistency (HEX005)
  const lifetimeMatch = message.match(
    /ERROR\[HEX005\]: Lifetime inconsistency for '(?<portName>[^']+)': Graph A provides (?<lifetimeA>\w+), Graph B provides (?<lifetimeB>\w+)/
  );
  if (lifetimeMatch?.groups) {
    return {
      code: GraphErrorCode.LIFETIME_INCONSISTENCY,
      message,
      details: {
        portName: lifetimeMatch.groups.portName,
        lifetimeA: lifetimeMatch.groups.lifetimeA,
        lifetimeB: lifetimeMatch.groups.lifetimeB,
      },
    };
  }

  // Self-dependency (HEX006)
  const selfDepMatch = message.match(
    /ERROR\[HEX006\]: Self-dependency detected\. Adapter for '(?<portName>[^']+)'/
  );
  if (selfDepMatch?.groups) {
    return {
      code: GraphErrorCode.SELF_DEPENDENCY,
      message,
      details: { portName: selfDepMatch.groups.portName },
    };
  }

  // Depth limit warning (HEX007)
  // Format may include: "for port 'X'" and/or "Last port visited: 'Y'"
  const depthLimitMatch = message.match(
    /WARNING\[HEX007\]: Type-level depth limit \((?<maxDepth>\d+)\) exceeded/
  );
  if (depthLimitMatch?.groups) {
    // Extract optional startPort: "for port 'X'"
    const startPortMatch = message.match(/exceeded for port '(?<startPort>[^']+)'/);
    // Extract optional lastPort: "Last port visited: 'Y'"
    const lastPortMatch = message.match(/Last port visited: '(?<lastPort>[^']+)'/);

    const details: DepthLimitExceededDetails = {
      maxDepth: depthLimitMatch.groups.maxDepth,
      ...(startPortMatch?.groups?.startPort && { startPort: startPortMatch.groups.startPort }),
      ...(lastPortMatch?.groups?.lastPort && { lastPort: lastPortMatch.groups.lastPort }),
    };

    return {
      code: GraphErrorCode.DEPTH_LIMIT_EXCEEDED,
      message,
      details,
    };
  }

  // Missing dependency (HEX008)
  const missingMatch = message.match(
    /ERROR\[HEX008\]: Missing adapters? for (?<missingPorts>[^.]+)\./
  );
  if (missingMatch?.groups) {
    return {
      code: GraphErrorCode.MISSING_DEPENDENCY,
      message,
      details: { missingPorts: missingMatch.groups.missingPorts },
    };
  }

  // Override without parent (HEX009)
  const overrideWithoutParentMatch = message.match(
    /ERROR\[HEX009\]: Cannot use override\(\) without forParent\(\)/
  );
  if (overrideWithoutParentMatch) {
    return {
      code: GraphErrorCode.OVERRIDE_WITHOUT_PARENT,
      message,
      details: {},
    };
  }

  // Missing provides (HEX010)
  const missingProvidesMatch = message.match(/ERROR\[HEX010\]/);
  if (missingProvidesMatch) {
    return {
      code: GraphErrorCode.MISSING_PROVIDES,
      message,
      details: {},
    };
  }

  // Invalid provides (HEX011)
  const invalidProvidesMatch = message.match(/ERROR\[HEX011\]:.*Got: (?<actualType>\w+)/);
  if (invalidProvidesMatch?.groups) {
    return {
      code: GraphErrorCode.INVALID_PROVIDES,
      message,
      details: { actualType: invalidProvidesMatch.groups.actualType },
    };
  }
  // Fallback for HEX011 without type info
  if (message.match(/ERROR\[HEX011\]/)) {
    return {
      code: GraphErrorCode.INVALID_PROVIDES,
      message,
      details: {},
    };
  }

  // Invalid requires type (HEX012)
  const invalidRequiresTypeMatch = message.match(/ERROR\[HEX012\]:.*Got: (?<actualType>\w+)/);
  if (invalidRequiresTypeMatch?.groups) {
    return {
      code: GraphErrorCode.INVALID_REQUIRES_TYPE,
      message,
      details: { actualType: invalidRequiresTypeMatch.groups.actualType },
    };
  }
  // Fallback for HEX012 without type info
  if (message.match(/ERROR\[HEX012\]/)) {
    return {
      code: GraphErrorCode.INVALID_REQUIRES_TYPE,
      message,
      details: {},
    };
  }

  // Invalid requires element (HEX013)
  const invalidRequiresElementMatch = message.match(
    /ERROR\[HEX013\]: .*'requires\[(?<index>\d+)\]'/
  );
  if (invalidRequiresElementMatch?.groups) {
    return {
      code: GraphErrorCode.INVALID_REQUIRES_ELEMENT,
      message,
      details: { index: invalidRequiresElementMatch.groups.index },
    };
  }

  // Invalid lifetime type (HEX014)
  const invalidLifetimeTypeMatch = message.match(/ERROR\[HEX014\]:.*Got: (?<actualType>\w+)/);
  if (invalidLifetimeTypeMatch?.groups) {
    return {
      code: GraphErrorCode.INVALID_LIFETIME_TYPE,
      message,
      details: { actualType: invalidLifetimeTypeMatch.groups.actualType },
    };
  }
  // Fallback for HEX014 without type info
  if (message.match(/ERROR\[HEX014\]/)) {
    return {
      code: GraphErrorCode.INVALID_LIFETIME_TYPE,
      message,
      details: {},
    };
  }

  // Invalid lifetime value (HEX015)
  const invalidLifetimeValueMatch = message.match(/ERROR\[HEX015\]:.*Got: "(?<actualValue>[^"]+)"/);
  if (invalidLifetimeValueMatch?.groups) {
    return {
      code: GraphErrorCode.INVALID_LIFETIME_VALUE,
      message,
      details: { actualValue: invalidLifetimeValueMatch.groups.actualValue },
    };
  }
  // Fallback for HEX015 without value info
  if (message.match(/ERROR\[HEX015\]/)) {
    return {
      code: GraphErrorCode.INVALID_LIFETIME_VALUE,
      message,
      details: {},
    };
  }

  // Invalid factory (HEX016)
  const invalidFactoryMatch = message.match(/ERROR\[HEX016\]:.*Got: (?<actualType>\w+)/);
  if (invalidFactoryMatch?.groups) {
    return {
      code: GraphErrorCode.INVALID_FACTORY,
      message,
      details: { actualType: invalidFactoryMatch.groups.actualType },
    };
  }
  // Fallback for HEX016 without type info
  if (message.match(/ERROR\[HEX016\]/)) {
    return {
      code: GraphErrorCode.INVALID_FACTORY,
      message,
      details: {},
    };
  }

  // Duplicate requires (HEX017)
  const duplicateRequiresMatch = message.match(
    /ERROR\[HEX017\]: .*Duplicate port '(?<portName>[^']+)'/
  );
  if (duplicateRequiresMatch?.groups) {
    return {
      code: GraphErrorCode.DUPLICATE_REQUIRES,
      message,
      details: { portName: duplicateRequiresMatch.groups.portName },
    };
  }

  // Invalid finalizer (HEX018)
  const invalidFinalizerMatch = message.match(/ERROR\[HEX018\]:.*got (?<actualType>\w+)/);
  if (invalidFinalizerMatch?.groups) {
    return {
      code: GraphErrorCode.INVALID_FINALIZER,
      message,
      details: { actualType: invalidFinalizerMatch.groups.actualType },
    };
  }
  // Fallback for HEX018 without type info
  if (message.match(/ERROR\[HEX018\]/)) {
    return {
      code: GraphErrorCode.INVALID_FINALIZER,
      message,
      details: {},
    };
  }

  // Invalid lazy port (HEX019)
  const invalidLazyPortMatch = message.match(/ERROR\[HEX019\]/);
  if (invalidLazyPortMatch) {
    return {
      code: GraphErrorCode.INVALID_LAZY_PORT,
      message,
      details: {},
    };
  }

  // Unknown HEX error format - return structured result instead of undefined
  // This handles future error codes and provides better tooling support
  // Extract the unknown HEX code for better diagnostics
  const unknownCodeMatch = message.match(/(?:ERROR|WARNING)\[HEX(\d{3})\]/);
  const unknownCode = unknownCodeMatch ? `HEX${unknownCodeMatch[1]}` : undefined;

  return {
    code: GraphErrorCode.UNKNOWN_ERROR,
    message,
    details: {
      rawMessage: message,
      ...(unknownCode && { unknownCode }),
    },
  };
}
