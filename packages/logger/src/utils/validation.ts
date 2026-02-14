/**
 * Annotation validation utilities for GxP compliance.
 *
 * Validates and sanitizes log annotation values to ensure they are
 * serializable, non-circular, and within size limits.
 *
 * @packageDocumentation
 */

import { getStderr } from "./stderr.js";

/**
 * Configuration for annotation validation.
 */
export interface ValidationConfig {
  /** Maximum object nesting depth. Defaults to 10. */
  readonly maxDepth: number;
  /** Maximum total keys across all levels. Defaults to 100. */
  readonly maxKeys: number;
}

/**
 * Default validation configuration.
 */
const DEFAULT_CONFIG: ValidationConfig = {
  maxDepth: 10,
  maxKeys: 100,
};

/**
 * Sanitizes annotation values to ensure they are safe for serialization.
 *
 * Removes:
 * - Functions (with stderr warning)
 * - Symbols (with stderr warning)
 * - BigInt values (with stderr warning)
 * - Circular references
 *
 * Enforces:
 * - Max nesting depth
 * - Max total key count
 *
 * Converts:
 * - undefined -> null
 *
 * @param annotations - The raw annotation record
 * @param config - Optional validation configuration
 * @returns A sanitized copy of the annotations
 */
export function sanitizeAnnotations(
  annotations: Record<string, unknown>,
  config: ValidationConfig = DEFAULT_CONFIG
): Record<string, unknown> {
  const seen = new WeakSet<object>();
  let keyCount = 0;

  function sanitize(value: unknown, depth: number): unknown {
    if (value === undefined) {
      return null;
    }

    if (
      value === null ||
      typeof value === "boolean" ||
      typeof value === "number" ||
      typeof value === "string"
    ) {
      return value;
    }

    if (typeof value === "function") {
      const fallback = getStderr();
      if (fallback) {
        fallback("[LOGGER VALIDATION] Function value detected in annotations. Removed.");
      }
      return "[non-serializable: function]";
    }

    if (typeof value === "symbol") {
      const fallback = getStderr();
      if (fallback) {
        fallback("[LOGGER VALIDATION] Symbol value detected in annotations. Removed.");
      }
      return "[non-serializable: symbol]";
    }

    if (typeof value === "bigint") {
      const fallback = getStderr();
      if (fallback) {
        fallback("[LOGGER VALIDATION] BigInt value detected in annotations. Converted to string.");
      }
      return value.toString();
    }

    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[circular reference]";
      }

      if (depth >= config.maxDepth) {
        return "[max depth exceeded]";
      }

      seen.add(value);

      if (Array.isArray(value)) {
        const result: unknown[] = [];
        for (const item of value) {
          if (keyCount >= config.maxKeys) {
            result.push("[truncated: max keys exceeded]");
            break;
          }
          keyCount++;
          result.push(sanitize(item, depth + 1));
        }
        seen.delete(value);
        return result;
      }

      const result: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        if (keyCount >= config.maxKeys) {
          result.__truncated = true;
          break;
        }
        keyCount++;
        const v = (value as Record<string, unknown>)[key];
        result[key] = sanitize(v, depth + 1);
      }
      seen.delete(value);
      return result;
    }

    return String(value);
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(annotations)) {
    if (keyCount >= config.maxKeys) {
      result.__truncated = true;
      break;
    }
    keyCount++;
    result[key] = sanitize(annotations[key], 0);
  }
  return result;
}
