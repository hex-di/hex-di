/**
 * Cross-platform utility functions for DataDog bridge.
 *
 * Provides safe access to console API without depending on DOM or Node.js types.
 * Uses the same pattern as @hex-di/tracing-otel for environment independence.
 *
 * @packageDocumentation
 */

/**
 * Subset of Console API used for error logging.
 */
export interface ConsoleLike {
  error(message: string, ...args: unknown[]): void;
}

function isConsoleLike(value: unknown): value is ConsoleLike {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "function"
  );
}

/**
 * Get the platform console API if available.
 *
 * @returns ConsoleLike or undefined if unavailable
 */
export function getConsole(): ConsoleLike | undefined {
  if (typeof globalThis === "undefined" || !("console" in globalThis)) {
    return undefined;
  }

  const g: Record<string, unknown> = globalThis;
  const cons: unknown = g.console;

  if (isConsoleLike(cons)) {
    return cons;
  }

  return undefined;
}

/**
 * Log an error message to console if available.
 *
 * @param message - Error message
 * @param args - Additional arguments
 */
export function logError(message: string, ...args: unknown[]): void {
  const cons = getConsole();
  if (cons) {
    cons.error(message, ...args);
  }
}
