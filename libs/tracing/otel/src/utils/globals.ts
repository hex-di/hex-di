/**
 * Typed cross-platform global accessors for tracing-otel package.
 *
 * Provides safe access to platform APIs (console, setTimeout, clearTimeout)
 * without depending on DOM or Node.js type definitions. Each accessor
 * encapsulates the `unknown` narrowing of `globalThis` in a single place.
 *
 * @packageDocumentation
 */

/** Subset of Console API used for error logging. */
export interface ConsoleLike {
  error(message: string, ...args: unknown[]): void;
}

/** Subset of setTimeout API for scheduling callbacks. */
interface SetTimeoutLike {
  (callback: () => void, ms: number): unknown;
}

/** Subset of clearTimeout API for cancelling scheduled callbacks. */
interface ClearTimeoutLike {
  (handle: unknown): void;
}

function isSetTimeoutLike(value: unknown): value is SetTimeoutLike {
  return typeof value === "function";
}

function isClearTimeoutLike(value: unknown): value is ClearTimeoutLike {
  return typeof value === "function";
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
 * Schedule a callback after a delay.
 *
 * Returns an opaque timer handle that can be passed to `safeClearTimeout`.
 *
 * @returns Timer handle, or undefined if setTimeout is unavailable
 */
export function safeSetTimeout(callback: () => void, ms: number): unknown {
  if (typeof globalThis === "undefined" || !("setTimeout" in globalThis)) {
    return undefined;
  }

  const g: Record<string, unknown> = globalThis;
  const fn: unknown = g.setTimeout;

  if (isSetTimeoutLike(fn)) {
    return fn(callback, ms);
  }

  return undefined;
}

/**
 * Cancel a previously scheduled timeout.
 *
 * @param handle - Timer handle from safeSetTimeout
 */
export function safeClearTimeout(handle: unknown): void {
  if (typeof globalThis === "undefined" || !("clearTimeout" in globalThis)) {
    return;
  }

  const g: Record<string, unknown> = globalThis;
  const fn: unknown = g.clearTimeout;

  if (isClearTimeoutLike(fn)) {
    fn(handle);
  }
}

/**
 * Check if setTimeout is available on this platform.
 */
export function hasSetTimeout(): boolean {
  if (typeof globalThis === "undefined" || !("setTimeout" in globalThis)) {
    return false;
  }
  const g: Record<string, unknown> = globalThis;
  return typeof g.setTimeout === "function";
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
