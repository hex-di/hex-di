/**
 * Stderr fallback utility for GxP compliance.
 *
 * Provides a safe way to output diagnostic messages when the
 * normal logging pipeline fails. Falls back through:
 * process.stderr -> console.error -> silent
 *
 * @packageDocumentation
 */

/** Minimal process interface for environments without Node.js types. */
declare const process:
  | undefined
  | {
      stderr?: { write?: (message: string) => unknown };
    };

/** Minimal console interface for environments without DOM types. */
declare const console: undefined | { error?: (...args: unknown[]) => void };

/**
 * Returns a function that writes to stderr, or undefined if unavailable.
 *
 * Falls back through: process.stderr.write -> console.error -> undefined
 */
export function getStderr(): ((message: string) => void) | undefined {
  if (
    typeof process !== "undefined" &&
    process.stderr !== undefined &&
    typeof process.stderr.write === "function"
  ) {
    const writeFn = process.stderr.write.bind(process.stderr);
    return (message: string) => {
      writeFn(message + "\n");
    };
  }
  if (typeof console !== "undefined" && typeof console.error === "function") {
    const errorFn = console.error.bind(console);
    return (message: string) => {
      errorFn(message);
    };
  }
  return undefined;
}
