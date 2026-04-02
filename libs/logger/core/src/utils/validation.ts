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

function warnStderr(message: string): void {
  const fallback = getStderr();
  if (fallback) {
    fallback(message);
  }
}

function sanitizePrimitive(value: unknown): unknown | undefined {
  if (value === undefined) return null;
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }
  return undefined;
}

function sanitizeNonSerializable(value: unknown): string | undefined {
  if (typeof value === "function") {
    warnStderr("[LOGGER VALIDATION] Function value detected in annotations. Removed.");
    return "[non-serializable: function]";
  }
  if (typeof value === "symbol") {
    warnStderr("[LOGGER VALIDATION] Symbol value detected in annotations. Removed.");
    return "[non-serializable: symbol]";
  }
  if (typeof value === "bigint") {
    warnStderr("[LOGGER VALIDATION] BigInt value detected in annotations. Converted to string.");
    return value.toString();
  }
  return undefined;
}

interface SanitizeContext {
  readonly seen: WeakSet<object>;
  readonly config: ValidationConfig;
  keyCount: number;
}

function sanitizeArray(value: unknown[], depth: number, ctx: SanitizeContext): unknown[] {
  const result: unknown[] = [];
  for (const item of value) {
    if (ctx.keyCount >= ctx.config.maxKeys) {
      result.push("[truncated: max keys exceeded]");
      break;
    }
    ctx.keyCount++;
    result.push(sanitize(item, depth + 1, ctx));
  }
  return result;
}

function sanitizeRecord(
  value: Record<string, unknown>,
  depth: number,
  ctx: SanitizeContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (ctx.keyCount >= ctx.config.maxKeys) {
      result.__truncated = true;
      break;
    }
    ctx.keyCount++;
    result[key] = sanitize(value[key], depth + 1, ctx);
  }
  return result;
}

function sanitizeObject(value: object, depth: number, ctx: SanitizeContext): unknown {
  if (ctx.seen.has(value)) return "[circular reference]";
  if (depth >= ctx.config.maxDepth) return "[max depth exceeded]";

  ctx.seen.add(value);
  const result = Array.isArray(value)
    ? sanitizeArray(value, depth, ctx)
    : sanitizeRecord(value as Record<string, unknown>, depth, ctx);
  ctx.seen.delete(value);
  return result;
}

function sanitize(value: unknown, depth: number, ctx: SanitizeContext): unknown {
  const primitive = sanitizePrimitive(value);
  if (primitive !== undefined || value === undefined) return primitive;

  const nonSerializable = sanitizeNonSerializable(value);
  if (nonSerializable !== undefined) return nonSerializable;

  if (typeof value === "object" && value !== null) {
    return sanitizeObject(value, depth, ctx);
  }

  return String(value);
}

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
  const ctx: SanitizeContext = {
    seen: new WeakSet<object>(),
    config,
    keyCount: 0,
  };
  return sanitizeRecord(annotations, -1, ctx);
}
