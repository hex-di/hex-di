/**
 * Redaction logger wrapper.
 *
 * Wraps a Logger to redact sensitive fields from annotations and context
 * before delegating to the underlying logger.
 *
 * @packageDocumentation
 */

import type { Logger } from "../ports/logger.js";
import type { LogLevel } from "../types/log-level.js";
import type { LogContext } from "../types/log-entry.js";

/**
 * Configuration for redaction behavior.
 */
export interface RedactionConfig {
  readonly paths: ReadonlyArray<string>;
  readonly censor?: string | ((value: unknown) => unknown);
}

/**
 * Default censor value used when none is provided.
 */
const DEFAULT_CENSOR = "[REDACTED]";

/**
 * Check if a value is a plain object (not null, not array).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Apply the censor to a value.
 */
function applyCensor(
  censor: string | ((value: unknown) => unknown) | undefined,
  value: unknown
): unknown {
  if (typeof censor === "function") {
    return censor(value);
  }
  return censor ?? DEFAULT_CENSOR;
}

/**
 * Redact fields from an object based on configured paths.
 *
 * Path matching rules:
 * - Exact: "password" matches key "password" at any depth
 * - Nested: "user.ssn" matches obj.user.ssn
 * - Wildcard: "*.secret" matches any object's "secret" field but NOT top-level "secret"
 */
function redactObject(
  obj: Record<string, unknown>,
  config: RedactionConfig,
  currentPath: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key;
    const value = obj[key];

    if (shouldRedact(key, fullPath, currentPath, config.paths)) {
      result[key] = applyCensor(config.censor, value);
    } else if (isPlainObject(value)) {
      result[key] = redactObject(value, config, fullPath);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Determine if a field should be redacted.
 */
function shouldRedact(
  key: string,
  fullPath: string,
  currentPath: string,
  paths: ReadonlyArray<string>
): boolean {
  for (const pattern of paths) {
    // Exact match: "password" matches key "password" at any level
    if (!pattern.includes(".") && !pattern.includes("*") && pattern === key) {
      return true;
    }

    // Nested match: "user.ssn" matches full path "user.ssn"
    if (!pattern.includes("*") && pattern.includes(".") && fullPath === pattern) {
      return true;
    }

    // Wildcard: "*.secret" matches any object's "secret" field, but NOT top-level
    if (pattern.startsWith("*.")) {
      const wildcardKey = pattern.slice(2);
      if (key === wildcardKey && currentPath !== "") {
        return true;
      }
    }
  }

  return false;
}

/**
 * Redact a record using the given config.
 */
function redactRecord(
  record: Record<string, unknown>,
  config: RedactionConfig
): Record<string, unknown> {
  return redactObject(record, config, "");
}

/**
 * Create a Logger wrapper that redacts sensitive fields.
 *
 * @param logger - The logger to wrap
 * @param config - Redaction configuration
 * @returns A new Logger with redaction applied
 */
export function withRedaction(logger: Logger, config: RedactionConfig): Logger {
  function redactAnnotations(
    annotations: Record<string, unknown> | undefined
  ): Record<string, unknown> | undefined {
    if (!annotations) return annotations;
    return redactRecord(annotations, config);
  }

  function redactContext(context: Partial<LogContext>): Partial<LogContext> {
    return redactRecord(context, config);
  }

  return {
    trace(message: string, annotations?: Record<string, unknown>): void {
      logger.trace(message, redactAnnotations(annotations));
    },

    debug(message: string, annotations?: Record<string, unknown>): void {
      logger.debug(message, redactAnnotations(annotations));
    },

    info(message: string, annotations?: Record<string, unknown>): void {
      logger.info(message, redactAnnotations(annotations));
    },

    warn(message: string, annotations?: Record<string, unknown>): void {
      logger.warn(message, redactAnnotations(annotations));
    },

    error(
      message: string,
      errorOrAnnotations?: Error | Record<string, unknown>,
      annotations?: Record<string, unknown>
    ): void {
      if (errorOrAnnotations instanceof Error) {
        logger.error(message, errorOrAnnotations, redactAnnotations(annotations));
      } else {
        logger.error(message, redactAnnotations(errorOrAnnotations));
      }
    },

    fatal(
      message: string,
      errorOrAnnotations?: Error | Record<string, unknown>,
      annotations?: Record<string, unknown>
    ): void {
      if (errorOrAnnotations instanceof Error) {
        logger.fatal(message, errorOrAnnotations, redactAnnotations(annotations));
      } else {
        logger.fatal(message, redactAnnotations(errorOrAnnotations));
      }
    },

    child(context: Partial<LogContext>): Logger {
      return withRedaction(logger.child(redactContext(context)), config);
    },

    withAnnotations(annotations: Record<string, unknown>): Logger {
      return withRedaction(logger.withAnnotations(redactRecord(annotations, config)), config);
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
