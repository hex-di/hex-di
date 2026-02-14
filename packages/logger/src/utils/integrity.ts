/**
 * Tamper evidence via entry hashing for GxP compliance.
 *
 * Provides an FNV-1a based hash chain for log entries, enabling
 * detection of missing, reordered, or modified entries.
 *
 * This is NOT cryptographic security -- it is tamper evidence
 * for honest systems (detecting corruption, not malice).
 *
 * @packageDocumentation
 */

import type { Logger } from "../ports/logger.js";
import type { LogLevel } from "../types/log-level.js";
import type { LogContext } from "../types/log-entry.js";

/**
 * Configuration for integrity hashing.
 */
export interface IntegrityConfig {
  readonly enabled: boolean;
}

/**
 * Integrity metadata attached to a log entry.
 */
export interface IntegrityInfo {
  readonly hash: string;
  readonly previousHash: string;
}

/**
 * FNV-1a hash (32-bit) for fast non-cryptographic hashing.
 *
 * FNV-1a was chosen for its simplicity, speed (~nanoseconds),
 * and good distribution for short strings.
 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Computes a hash for a log entry based on its canonical fields
 * and the previous entry's hash, forming a hash chain.
 *
 * @param entry - Canonical fields of the entry
 * @param previousHash - Hash of the previous entry (or "0" for first)
 * @returns The computed hash string
 */
export function computeEntryHash(
  entry: { level: string; message: string; timestamp: number; sequence: number },
  previousHash: string
): string {
  const canonical = `${previousHash}|${entry.sequence}|${entry.timestamp}|${entry.level}|${entry.message}`;
  return fnv1a(canonical);
}

/**
 * Creates a Logger wrapper that computes and attaches integrity hashes
 * to log entry annotations.
 *
 * Each entry's hash is computed from its canonical fields and the
 * previous entry's hash, forming a chain. Any gap or mutation
 * breaks the chain, enabling detection.
 *
 * @param logger - The logger to wrap
 * @param _config - Integrity configuration (reserved for future options)
 * @returns A Logger that attaches integrity metadata to annotations
 */
export function withIntegrity(logger: Logger, _config?: IntegrityConfig): Logger {
  let previousHash = "00000000";

  function attachHash(
    annotations: Record<string, unknown> | undefined,
    level: string,
    message: string
  ): Record<string, unknown> {
    const sequence = (annotations as Record<string, unknown> | undefined)?.sequence;
    const timestamp = Date.now();
    const seqNum = typeof sequence === "number" ? sequence : 0;
    const hash = computeEntryHash({ level, message, timestamp, sequence: seqNum }, previousHash);
    const result: Record<string, unknown> = {};
    if (annotations) {
      for (const key of Object.keys(annotations)) {
        result[key] = annotations[key];
      }
    }
    result.__integrity = { hash, previousHash } satisfies IntegrityInfo;
    previousHash = hash;
    return result;
  }

  return {
    trace(message: string, annotations?: Record<string, unknown>): void {
      logger.trace(message, attachHash(annotations, "trace", message));
    },

    debug(message: string, annotations?: Record<string, unknown>): void {
      logger.debug(message, attachHash(annotations, "debug", message));
    },

    info(message: string, annotations?: Record<string, unknown>): void {
      logger.info(message, attachHash(annotations, "info", message));
    },

    warn(message: string, annotations?: Record<string, unknown>): void {
      logger.warn(message, attachHash(annotations, "warn", message));
    },

    error(
      message: string,
      errorOrAnnotations?: Error | Record<string, unknown>,
      annotations?: Record<string, unknown>
    ): void {
      if (errorOrAnnotations instanceof Error) {
        logger.error(message, errorOrAnnotations, attachHash(annotations, "error", message));
      } else {
        logger.error(message, attachHash(errorOrAnnotations, "error", message));
      }
    },

    fatal(
      message: string,
      errorOrAnnotations?: Error | Record<string, unknown>,
      annotations?: Record<string, unknown>
    ): void {
      if (errorOrAnnotations instanceof Error) {
        logger.fatal(message, errorOrAnnotations, attachHash(annotations, "fatal", message));
      } else {
        logger.fatal(message, attachHash(errorOrAnnotations, "fatal", message));
      }
    },

    child(context: Partial<LogContext>): Logger {
      return withIntegrity(logger.child(context));
    },

    withAnnotations(annotations: Record<string, unknown>): Logger {
      return withIntegrity(logger.withAnnotations(annotations));
    },

    isLevelEnabled(level: LogLevel): boolean {
      return logger.isLevelEnabled(level);
    },

    getContext(): LogContext {
      return logger.getContext();
    },

    time<T>(name: string, fn: () => T): T {
      return logger.time(name, fn);
    },

    timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
      return logger.timeAsync(name, fn);
    },
  };
}
