/**
 * Error Codes for HexDI.
 *
 * All error messages follow the format: `ERROR[HEXxxx]: Description...`
 *
 * ## Error Code Ranges
 *
 * | Range    | Category                        |
 * |----------|---------------------------------|
 * | HEX001-009 | Graph validation errors       |
 * | HEX010-019 | Adapter configuration errors  |
 * | HEX020-025 | Runtime/container errors      |
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
export const NumericErrorCode = {
  // Graph validation errors (HEX001-009)
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

  // Adapter configuration errors (HEX010-019)
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

  // Runtime/container errors (HEX020-025)
  /** HEX020: Sync factory function threw during instance creation */
  FACTORY_FAILED: "HEX020",
  /** HEX021: Async factory function threw during instance creation */
  ASYNC_FACTORY_FAILED: "HEX021",
  /** HEX022: Attempted to resolve from a disposed scope/container */
  DISPOSED_SCOPE: "HEX022",
  /** HEX023: Scoped port resolved from root container (requires scope) */
  SCOPE_REQUIRED: "HEX023",
  /** HEX024: Async port resolved synchronously without initialization */
  ASYNC_INIT_REQUIRED: "HEX024",
  /** HEX025: Non-clonable adapter used with forked inheritance mode */
  NON_CLONABLE_FORKED: "HEX025",
} as const;

/**
 * Union type of all numeric error codes.
 */
export type NumericErrorCodeType = (typeof NumericErrorCode)[keyof typeof NumericErrorCode];

/**
 * Structured error codes for programmatic error handling.
 *
 * These codes enable programmatic error handling without parsing error
 * message text. Each code corresponds to a specific validation failure type.
 */
export const ErrorCode = {
  // Graph validation errors
  DUPLICATE_ADAPTER: "DUPLICATE_ADAPTER",
  CIRCULAR_DEPENDENCY: "CIRCULAR_DEPENDENCY",
  CAPTIVE_DEPENDENCY: "CAPTIVE_DEPENDENCY",
  REVERSE_CAPTIVE_DEPENDENCY: "REVERSE_CAPTIVE_DEPENDENCY",
  LIFETIME_INCONSISTENCY: "LIFETIME_INCONSISTENCY",
  SELF_DEPENDENCY: "SELF_DEPENDENCY",
  DEPTH_LIMIT_EXCEEDED: "DEPTH_LIMIT_EXCEEDED",
  MISSING_DEPENDENCY: "MISSING_DEPENDENCY",
  OVERRIDE_WITHOUT_PARENT: "OVERRIDE_WITHOUT_PARENT",

  // Adapter configuration errors
  MISSING_PROVIDES: "MISSING_PROVIDES",
  INVALID_PROVIDES: "INVALID_PROVIDES",
  INVALID_REQUIRES_TYPE: "INVALID_REQUIRES_TYPE",
  INVALID_REQUIRES_ELEMENT: "INVALID_REQUIRES_ELEMENT",
  INVALID_LIFETIME_TYPE: "INVALID_LIFETIME_TYPE",
  INVALID_LIFETIME_VALUE: "INVALID_LIFETIME_VALUE",
  INVALID_FACTORY: "INVALID_FACTORY",
  DUPLICATE_REQUIRES: "DUPLICATE_REQUIRES",
  INVALID_FINALIZER: "INVALID_FINALIZER",
  INVALID_LAZY_PORT: "INVALID_LAZY_PORT",

  // Runtime/container errors
  FACTORY_FAILED: "FACTORY_FAILED",
  ASYNC_FACTORY_FAILED: "ASYNC_FACTORY_FAILED",
  DISPOSED_SCOPE: "DISPOSED_SCOPE",
  SCOPE_REQUIRED: "SCOPE_REQUIRED",
  ASYNC_INIT_REQUIRED: "ASYNC_INIT_REQUIRED",
  NON_CLONABLE_FORKED: "NON_CLONABLE_FORKED",

  // Meta error types
  MULTIPLE_ERRORS: "MULTIPLE_ERRORS",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

/**
 * Union type of all error codes.
 */
export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
