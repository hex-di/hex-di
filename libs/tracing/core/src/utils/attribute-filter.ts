/**
 * Attribute filtering for PII redaction and size enforcement.
 *
 * Creates reusable filter functions that sanitize span attributes
 * before they reach exporters. Ensures PII is redacted, keys are
 * bounded, and values are size-limited.
 *
 * @packageDocumentation
 */

import type { Attributes, AttributeValue } from "../types/index.js";
import type { AttributeFilterConfig } from "../types/attribute-filter.js";

const DEFAULT_MAX_VALUE_LENGTH = 4096;
const DEFAULT_MAX_KEY_LENGTH = 256;
const DEFAULT_MAX_ARRAY_LENGTH = 128;

/**
 * Creates a reusable attribute filter function from config.
 *
 * Returns a function that accepts Attributes and returns
 * sanitized Attributes with PII redacted and sizes enforced.
 *
 * @param config - Filter configuration specifying blocked keys, size limits, and redaction rules
 * @returns A filter function that sanitizes attributes
 *
 * @example
 * ```typescript
 * const filter = createAttributeFilter({
 *   blockedKeys: ['user.email', 'user.ssn'],
 *   blockedKeyPrefixes: ['pii.'],
 *   maxValueLength: 4096,
 * });
 *
 * const clean = filter({ 'user.email': 'test@example.com', 'http.method': 'GET' });
 * // { 'http.method': 'GET' }
 * ```
 *
 * @public
 */
export function createAttributeFilter(
  config: AttributeFilterConfig
): (attributes: Attributes) => Attributes {
  const blockedKeys = new Set(config.blockedKeys ?? []);
  const blockedPrefixes = config.blockedKeyPrefixes ?? [];
  const maxValueLength = config.maxValueLength ?? DEFAULT_MAX_VALUE_LENGTH;
  const maxKeyLength = config.maxKeyLength ?? DEFAULT_MAX_KEY_LENGTH;
  const maxArrayLength = config.maxArrayLength ?? DEFAULT_MAX_ARRAY_LENGTH;
  const redactValue = config.redactValue;

  function isBlocked(key: string): boolean {
    if (blockedKeys.has(key)) return true;
    for (const prefix of blockedPrefixes) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  }

  function sanitizeValue(key: string, value: AttributeValue): AttributeValue | undefined {
    if (typeof value === "string") {
      let sanitized = value;
      if (redactValue) {
        const result = redactValue(key, sanitized);
        if (result === undefined) return undefined;
        sanitized = result;
      }
      if (sanitized.length > maxValueLength) {
        return sanitized.slice(0, maxValueLength) + "[TRUNCATED]";
      }
      return sanitized;
    }
    if (Array.isArray(value)) {
      if (value.length > maxArrayLength) {
        return value.slice(0, maxArrayLength);
      }
    }
    return value;
  }

  return function filterAttributes(attributes: Attributes): Attributes {
    const filtered: Record<string, AttributeValue> = {};
    for (const key in attributes) {
      if (key.length > maxKeyLength) continue;
      if (isBlocked(key)) continue;
      const sanitized = sanitizeValue(key, attributes[key]);
      if (sanitized !== undefined) {
        filtered[key] = sanitized;
      }
    }
    return filtered;
  };
}
