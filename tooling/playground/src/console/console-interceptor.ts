/**
 * Console Interceptor
 *
 * Captures sandbox console calls (log, warn, error, info, debug) and
 * converts them to ConsoleEntry objects. Used to intercept and serialize
 * console output from user code execution.
 *
 * @see spec/playground/05-layout-and-panels.md Section 23
 */

import type { ConsoleEntry, SerializedValue } from "../sandbox/worker-protocol.js";
import { serializeValue } from "../sandbox/worker-protocol.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Console levels that can be intercepted. */
export type ConsoleLevel = "log" | "warn" | "error" | "info" | "debug";

/** Callback for captured console entries. */
export type ConsoleEntryListener = (entry: ConsoleEntry) => void;

/** Interface for an interceptable console object. */
export interface InterceptableConsole {
  log(...args: readonly unknown[]): void;
  warn(...args: readonly unknown[]): void;
  error(...args: readonly unknown[]): void;
  info(...args: readonly unknown[]): void;
  debug(...args: readonly unknown[]): void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum characters for a serialized string value. */
const MAX_STRING_LENGTH = 10_000;

/** Maximum depth for object serialization. */
const MAX_DEPTH = 5;

/** Maximum number of entries to keep. */
export const MAX_ENTRIES = 1000;

// ---------------------------------------------------------------------------
// Truncation helpers
// ---------------------------------------------------------------------------

/**
 * Truncate a serialized value's string representation to the max length.
 */
function truncateSerializedValue(value: SerializedValue): SerializedValue {
  if (value.type === "string" && value.value.length > MAX_STRING_LENGTH) {
    return {
      type: value.type,
      value: value.value.slice(0, MAX_STRING_LENGTH) + "... (truncated)",
      preview: value.preview,
    };
  }
  return value;
}

/**
 * Recursively truncate objects/arrays at a given depth.
 */
function truncateAtDepth(value: unknown, currentDepth: number): unknown {
  if (currentDepth >= MAX_DEPTH) {
    if (Array.isArray(value)) return "[Array]";
    if (typeof value === "object" && value !== null) return "[Object]";
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => truncateAtDepth(item, currentDepth + 1));
  }

  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = truncateAtDepth(val, currentDepth + 1);
    }
    return result;
  }

  return value;
}

/**
 * Serialize a console argument with truncation limits applied.
 */
export function serializeConsoleArg(value: unknown): SerializedValue {
  const truncated = truncateAtDepth(value, 0);
  const serialized = serializeValue(truncated);
  return truncateSerializedValue(serialized);
}

// ---------------------------------------------------------------------------
// ConsoleInterceptor
// ---------------------------------------------------------------------------

/**
 * Creates a console interceptor that captures console method calls
 * as ConsoleEntry objects. Each captured entry is passed to the
 * provided listener callback.
 *
 * Returns an interceptable console object and management functions.
 */
export function createConsoleInterceptor(listener: ConsoleEntryListener): {
  /** Console object whose methods trigger entries. */
  readonly console: InterceptableConsole;
  /** All accumulated entries (limited to MAX_ENTRIES). */
  readonly getEntries: () => readonly ConsoleEntry[];
  /** Clear accumulated entries. */
  readonly clear: () => void;
  /** Add a non-log entry (compilation-error, runtime-error, etc.). */
  readonly addEntry: (entry: ConsoleEntry) => void;
} {
  const entries: ConsoleEntry[] = [];

  function addEntry(entry: ConsoleEntry): void {
    entries.push(entry);
    // Enforce max entries limit by removing oldest
    while (entries.length > MAX_ENTRIES) {
      entries.shift();
    }
    listener(entry);
  }

  function createLogMethod(level: ConsoleLevel): (...args: readonly unknown[]) => void {
    return (...args: readonly unknown[]): void => {
      const serializedArgs = args.map(serializeConsoleArg);
      const entry: ConsoleEntry = {
        type: "log",
        level,
        args: serializedArgs,
        timestamp: Date.now(),
      };
      addEntry(entry);
    };
  }

  const interceptConsole: InterceptableConsole = {
    log: createLogMethod("log"),
    warn: createLogMethod("warn"),
    error: createLogMethod("error"),
    info: createLogMethod("info"),
    debug: createLogMethod("debug"),
  };

  return {
    console: interceptConsole,
    getEntries: () => [...entries],
    clear: () => {
      entries.length = 0;
    },
    addEntry,
  };
}
