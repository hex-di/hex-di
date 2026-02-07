/**
 * Typed cross-platform global accessors.
 *
 * Provides safe access to platform APIs (crypto, performance, console, process)
 * without depending on DOM or Node.js type definitions. Each accessor encapsulates
 * the `unknown` narrowing of `globalThis` in a single place, returning a typed
 * interface or `undefined` when the API is unavailable.
 *
 * @packageDocumentation
 */

/** Subset of Crypto API used for ID generation. */
export interface CryptoLike {
  getRandomValues(array: Uint8Array): Uint8Array;
}

/** Subset of Performance API used for high-resolution timing. */
export interface PerformanceLike {
  readonly timeOrigin: number;
  now(): number;
}

/** Subset of Console API used for logging. */
export interface ConsoleLike {
  log(message: string): void;
}

function isCryptoLike(value: unknown): value is CryptoLike {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "getRandomValues" in value &&
    typeof value.getRandomValues === "function"
  );
}

function isPerformanceLike(value: unknown): value is PerformanceLike {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "timeOrigin" in value &&
    typeof value.timeOrigin === "number" &&
    "now" in value &&
    typeof value.now === "function"
  );
}

function isConsoleLike(value: unknown): value is ConsoleLike {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "log" in value &&
    typeof value.log === "function"
  );
}

/**
 * Get the platform crypto API if available.
 *
 * Works in browsers (Web Crypto) and Node.js 15+ (globalThis.crypto).
 *
 * @returns CryptoLike or undefined if unavailable
 */
export function getCrypto(): CryptoLike | undefined {
  if (typeof globalThis === "undefined" || !("crypto" in globalThis)) {
    return undefined;
  }

  const g: Record<string, unknown> = globalThis;
  const crypto: unknown = g.crypto;

  if (isCryptoLike(crypto)) {
    return crypto;
  }

  return undefined;
}

/**
 * Get the platform performance API if available.
 *
 * Works in browsers and Node.js 16+ (globalThis.performance).
 *
 * @returns PerformanceLike or undefined if unavailable
 */
export function getPerformance(): PerformanceLike | undefined {
  if (typeof globalThis === "undefined" || !("performance" in globalThis)) {
    return undefined;
  }

  const g: Record<string, unknown> = globalThis;
  const perf: unknown = g.performance;

  if (isPerformanceLike(perf)) {
    return perf;
  }

  return undefined;
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
 * Detect whether stdout is a TTY (for terminal colorization).
 *
 * Checks Node.js `process.stdout.isTTY`. Returns false in non-Node
 * environments or when stdout is not a TTY (e.g., piped output).
 *
 * @returns true if running in a TTY terminal
 */
export function getStdoutTTY(): boolean {
  try {
    if (typeof globalThis === "undefined" || !("process" in globalThis)) {
      return false;
    }

    const g: Record<string, unknown> = globalThis;
    const proc: unknown = g.process;

    if (proc && typeof proc === "object" && "stdout" in proc) {
      const stdout: unknown = proc.stdout;
      if (stdout && typeof stdout === "object" && "isTTY" in stdout) {
        return stdout.isTTY === true;
      }
    }
  } catch {
    // Ignore errors
  }
  return false;
}
