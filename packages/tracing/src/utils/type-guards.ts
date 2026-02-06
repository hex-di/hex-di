/**
 * Type guard utilities for runtime validation.
 *
 * Validates attribute values, span kinds, span statuses, and trace IDs
 * without using type casts. All type narrowing is done through proper
 * TypeScript type guards.
 *
 * @packageDocumentation
 */

import type { AttributeValue, SpanKind, SpanStatus } from "../types";

/**
 * Check if value is a valid attribute value.
 *
 * Valid attribute values per OpenTelemetry spec:
 * - Primitives: string, number (not NaN), boolean
 * - Arrays: string[], number[], boolean[] (homogeneous, no NaN)
 * - Invalid: null, undefined, objects, mixed arrays, NaN
 *
 * **Examples:**
 * ```typescript
 * isAttributeValue('GET')           // true
 * isAttributeValue(200)             // true
 * isAttributeValue(true)            // true
 * isAttributeValue(['a', 'b'])      // true
 * isAttributeValue([1, 2, 3])       // true
 * isAttributeValue(NaN)             // false
 * isAttributeValue(null)            // false
 * isAttributeValue([1, 'mixed'])    // false
 * ```
 *
 * @param value - Value to check
 * @returns true if value is a valid AttributeValue
 * @public
 */
export function isAttributeValue(value: unknown): value is AttributeValue {
  // Reject null, undefined
  if (value === null || value === undefined) {
    return false;
  }

  // Check primitives
  if (typeof value === "string") {
    return true;
  }

  if (typeof value === "number") {
    return !Number.isNaN(value);
  }

  if (typeof value === "boolean") {
    return true;
  }

  // Check arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return false;
    }

    const firstElement = value[0];

    // Check string[]
    if (typeof firstElement === "string") {
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] !== "string") {
          return false;
        }
      }
      return true;
    }

    // Check number[]
    if (typeof firstElement === "number") {
      for (let i = 0; i < value.length; i++) {
        const element = value[i];
        if (typeof element !== "number" || Number.isNaN(element)) {
          return false;
        }
      }
      return true;
    }

    // Check boolean[]
    if (typeof firstElement === "boolean") {
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] !== "boolean") {
          return false;
        }
      }
      return true;
    }

    // Mixed or invalid array type
    return false;
  }

  // Reject objects and other types
  return false;
}

/**
 * Check if value is a valid span kind.
 *
 * Valid span kinds per OpenTelemetry spec:
 * - `'internal'`: Application code, business logic
 * - `'server'`: Handling incoming requests
 * - `'client'`: Outgoing requests
 * - `'producer'`: Publishing messages
 * - `'consumer'`: Processing messages
 *
 * @param value - Value to check
 * @returns true if value is a valid SpanKind
 * @public
 */
export function isSpanKind(value: unknown): value is SpanKind {
  return (
    value === "internal" ||
    value === "server" ||
    value === "client" ||
    value === "producer" ||
    value === "consumer"
  );
}

/**
 * Check if value is a valid span status.
 *
 * Valid span statuses per OpenTelemetry spec:
 * - `'unset'`: Default, no explicit success/failure
 * - `'ok'`: Operation explicitly succeeded
 * - `'error'`: Operation failed
 *
 * @param value - Value to check
 * @returns true if value is a valid SpanStatus
 * @public
 */
export function isSpanStatus(value: unknown): value is SpanStatus {
  return value === "unset" || value === "ok" || value === "error";
}

/**
 * Check if string is a valid W3C trace ID.
 *
 * Valid trace ID format:
 * - Exactly 32 lowercase hex characters
 * - Not all zeros (invalid per W3C spec)
 *
 * **Examples:**
 * ```typescript
 * isValidTraceId('4bf92f3577b34da6a3ce929d0e0e4736')  // true
 * isValidTraceId('00000000000000000000000000000000')  // false (all zeros)
 * isValidTraceId('4bf92f35')                          // false (too short)
 * isValidTraceId('GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')  // false (not hex)
 * ```
 *
 * @param id - String to validate
 * @returns true if id is valid trace ID format
 * @public
 */
export function isValidTraceId(id: string): boolean {
  // Check length and hex pattern
  if (id.length !== 32) {
    return false;
  }

  let isAllZeros = true;

  for (let i = 0; i < id.length; i++) {
    const char = id[i];
    if (char === undefined) {
      return false;
    }

    // Check if valid hex char (0-9, a-f)
    const isHex = (char >= "0" && char <= "9") || (char >= "a" && char <= "f");

    if (!isHex) {
      return false;
    }

    // Track if any non-zero char
    if (char !== "0") {
      isAllZeros = false;
    }
  }

  // Reject all zeros
  return !isAllZeros;
}

/**
 * Check if string is a valid W3C span ID.
 *
 * Valid span ID format:
 * - Exactly 16 lowercase hex characters
 * - Not all zeros (invalid per W3C spec)
 *
 * **Examples:**
 * ```typescript
 * isValidSpanId('00f067aa0ba902b7')  // true
 * isValidSpanId('0000000000000000')  // false (all zeros)
 * isValidSpanId('00f067aa')          // false (too short)
 * isValidSpanId('GGGGGGGGGGGGGGGG')  // false (not hex)
 * ```
 *
 * @param id - String to validate
 * @returns true if id is valid span ID format
 * @public
 */
export function isValidSpanId(id: string): boolean {
  // Check length and hex pattern
  if (id.length !== 16) {
    return false;
  }

  let isAllZeros = true;

  for (let i = 0; i < id.length; i++) {
    const char = id[i];
    if (char === undefined) {
      return false;
    }

    // Check if valid hex char (0-9, a-f)
    const isHex = (char >= "0" && char <= "9") || (char >= "a" && char <= "f");

    if (!isHex) {
      return false;
    }

    // Track if any non-zero char
    if (char !== "0") {
      isAllZeros = false;
    }
  }

  // Reject all zeros
  return !isAllZeros;
}
