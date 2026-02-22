/**
 * Typed cross-platform global accessors for the logging package.
 *
 * Provides safe access to console API without depending on DOM type definitions.
 *
 * @packageDocumentation
 */

/** Subset of Console API used for logging output. */
export interface ConsoleLike {
  log(message: string): void;
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

function isConsoleLike(value: unknown): value is ConsoleLike {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "log" in value &&
    typeof value.log === "function" &&
    "debug" in value &&
    typeof value.debug === "function" &&
    "info" in value &&
    typeof value.info === "function" &&
    "warn" in value &&
    typeof value.warn === "function" &&
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
