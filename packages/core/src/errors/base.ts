/**
 * Base error class for all HexDI errors.
 *
 * @packageDocumentation
 */

import type { BlameContext } from "./blame.js";
import { createBlameContext } from "./blame.js";

// V8-specific Error.captureStackTrace type
type V8ErrorConstructor = typeof Error & {
  captureStackTrace?(targetObject: object, constructorOpt?: unknown): void;
};

// =============================================================================
// Error Message Extraction
// =============================================================================

/**
 * Checks if a value is an object with a string `message` property.
 * Used to detect error-like objects that don't extend Error.
 */
export function hasMessageProperty(value: unknown): value is { message: string } {
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
 * 1. Standard Error instances → uses error.message
 * 2. Objects with `message` property → uses the message property
 * 3. Other values → converts to string
 *
 * This properly handles custom error objects that have a `message` property
 * but don't extend Error (e.g., from external libraries or serialized errors).
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
// ContainerError Abstract Base Class
// =============================================================================

/**
 * Abstract base class for all container-related errors.
 *
 * Provides a consistent structure for error handling with:
 * - `code`: A stable string constant for programmatic error identification
 * - `isProgrammingError`: Indicates whether this error represents a programming
 *   mistake (true) or a runtime condition (false)
 * - `blame`: Optional blame context identifying which adapter violated which contract
 *
 * @remarks
 * - All concrete error classes must extend this base class
 * - The `name` getter returns the concrete class name for stack traces
 * - Uses `Error.captureStackTrace` when available for cleaner stack traces
 *
 * @example
 * ```typescript
 * try {
 *   container.resolve(SomePort);
 * } catch (error) {
 *   if (error instanceof ContainerError) {
 *     console.log(`Error code: ${error.code}`);
 *     if (error.blame) {
 *       console.log(`Blame: ${error.blame.adapterFactory.name}`);
 *     }
 *   }
 * }
 * ```
 */
export abstract class ContainerError extends Error {
  /**
   * A stable string constant identifying the error type.
   * Suitable for programmatic error handling and logging.
   */
  abstract readonly code: string;

  /**
   * Indicates whether this error represents a programming mistake.
   *
   * - `true`: The error is caused by incorrect usage (e.g., circular dependency,
   *   resolving from disposed scope, missing scope). These should be fixed in code.
   * - `false`: The error is caused by runtime conditions (e.g., factory threw).
   *   These may be recoverable or require operational handling.
   */
  abstract readonly isProgrammingError: boolean;

  /**
   * Optional blame context identifying which adapter violated which port contract.
   *
   * When present, the blame context is always frozen.
   *
   * @see {@link BlameContext}
   */
  readonly blame?: BlameContext;

  /**
   * Creates a new ContainerError instance.
   *
   * @param message - The error message describing what went wrong
   * @param blame - Optional blame context for error attribution
   */
  constructor(message: string, blame?: BlameContext) {
    super(message);

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Freeze and attach blame context if provided
    if (blame !== undefined) {
      this.blame = createBlameContext(blame);
    }

    // Capture stack trace excluding this constructor for cleaner traces
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
