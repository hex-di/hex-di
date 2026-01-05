/**
 * Flow error base class for @hex-di/flow.
 *
 * All flow-related errors extend the abstract FlowError base class,
 * providing consistent error structure with:
 * - `code`: Stable string constant for programmatic handling
 * - `machineId`: Optional associated machine identifier
 *
 * @packageDocumentation
 */

// V8-specific Error.captureStackTrace type
// We use a type alias to type the V8-specific static method without conflicts
type V8ErrorConstructor = typeof Error & {
  captureStackTrace?(targetObject: object, constructorOpt?: unknown): void;
};

// =============================================================================
// Error Message Extraction
// =============================================================================

/**
 * Checks if a value is an object with a string `message` property.
 * Used to detect error-like objects that don't extend Error.
 * @internal
 */
function hasMessageProperty(value: unknown): value is { message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string"
  );
}

/**
 * Extracts a human-readable error message from an unknown thrown value.
 *
 * Handles:
 * 1. Standard Error instances -> uses error.message
 * 2. Objects with `message` property -> uses the message property
 * 3. Other values -> converts to string
 *
 * @param cause - The unknown thrown value
 * @returns A human-readable error message string
 * @internal
 */
export function extractErrorMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  if (hasMessageProperty(cause)) {
    return cause.message;
  }
  return String(cause);
}

// =============================================================================
// FlowError Abstract Base Class
// =============================================================================

/**
 * Abstract base class for all flow-related errors.
 *
 * Provides a consistent structure for error handling with:
 * - `code`: A stable string constant for programmatic error identification
 * - `machineId`: Optional identifier of the machine where the error occurred
 *
 * @remarks
 * - All concrete error classes must extend this base class
 * - The `name` getter returns the concrete class name for stack traces
 * - Uses `Error.captureStackTrace` when available for cleaner stack traces
 *
 * @example
 * ```typescript
 * try {
 *   runner.send({ type: 'INVALID_EVENT' });
 * } catch (error) {
 *   if (error instanceof FlowError) {
 *     console.log(`Error code: ${error.code}`);
 *     if (error.machineId) {
 *       console.log(`Machine: ${error.machineId}`);
 *     }
 *   }
 * }
 * ```
 */
export abstract class FlowError extends Error {
  /**
   * A stable string constant identifying the error type.
   * Suitable for programmatic error handling and logging.
   */
  abstract readonly code: string;

  /**
   * The optional machine identifier where the error occurred.
   * May be undefined if error is not associated with a specific machine.
   */
  abstract readonly machineId: string | undefined;

  /**
   * Creates a new FlowError instance.
   *
   * @param message - The error message describing what went wrong
   */
  constructor(message: string) {
    super(message);

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace excluding this constructor for cleaner traces
    // Note: captureStackTrace is V8-specific (Node.js, Chrome)
    const ErrorWithCapture: V8ErrorConstructor = Error;
    if (typeof ErrorWithCapture.captureStackTrace === "function") {
      ErrorWithCapture.captureStackTrace(this, new.target);
    }
  }

  /**
   * Returns the concrete class name for this error.
   * Used in stack traces and error logging.
   */
  override get name(): string {
    return this.constructor.name;
  }
}
