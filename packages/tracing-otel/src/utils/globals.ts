/**
 * Cross-platform global accessors for tracing-otel package.
 *
 * Provides safe typed access to platform APIs without depending on
 * DOM or Node.js type definitions.
 *
 * @packageDocumentation
 */

/**
 * Subset of Console API used for error logging.
 */
export interface ConsoleLike {
  error(message: string, ...args: unknown[]): void;
}

/**
 * Type for setTimeout function signature.
 */
export type SetTimeoutFn = (callback: () => void, ms: number) => number | object;

/**
 * Type for clearTimeout function signature.
 */
export type ClearTimeoutFn = (id: number | object) => void;

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
 * Get the platform setTimeout function if available.
 *
 * @returns setTimeout function or undefined if unavailable
 */
export function getSetTimeout(): SetTimeoutFn | undefined {
  if (typeof globalThis === "undefined" || !("setTimeout" in globalThis)) {
    return undefined;
  }

  const g: Record<string, unknown> = globalThis;
  const setTimeoutFn: unknown = g.setTimeout;

  if (isSetTimeoutFn(setTimeoutFn)) {
    return setTimeoutFn;
  }

  return undefined;
}

function isSetTimeoutFn(value: unknown): value is SetTimeoutFn {
  return typeof value === "function";
}

/**
 * Get the platform clearTimeout function if available.
 *
 * @returns clearTimeout function or undefined if unavailable
 */
export function getClearTimeout(): ClearTimeoutFn | undefined {
  if (typeof globalThis === "undefined" || !("clearTimeout" in globalThis)) {
    return undefined;
  }

  const g: Record<string, unknown> = globalThis;
  const clearTimeoutFn: unknown = g.clearTimeout;

  if (isClearTimeoutFn(clearTimeoutFn)) {
    return clearTimeoutFn;
  }

  return undefined;
}

function isClearTimeoutFn(value: unknown): value is ClearTimeoutFn {
  return typeof value === "function";
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
