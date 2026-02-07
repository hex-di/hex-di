/**
 * Trace and span ID generation utilities.
 *
 * Implements W3C Trace Context ID format:
 * - Trace ID: 32 hex characters (16 bytes)
 * - Span ID: 16 hex characters (8 bytes)
 *
 * Uses crypto.getRandomValues when available (browser, Node.js 15+),
 * falls back to Math.random for development/testing environments.
 *
 * @packageDocumentation
 */

import { getCrypto } from "./globals.js";

/**
 * Hex character lookup table for fast byte-to-hex conversion.
 * Using array lookup is ~3x faster than toString(16).padStart().
 */
const HEX_CHARS = "0123456789abcdef".split("");

/**
 * Reusable buffer for trace ID generation to avoid allocation overhead.
 */
const traceIdBuffer = new Uint8Array(16);

/**
 * Reusable buffer for span ID generation to avoid allocation overhead.
 */
const spanIdBuffer = new Uint8Array(8);

/**
 * Convert byte array to hex string using lookup table.
 *
 * ~3x faster than byte.toString(16).padStart(2, "0") approach.
 *
 * @param bytes - Byte array to convert
 * @returns Lowercase hex string (2 chars per byte)
 */
function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      hex += HEX_CHARS[byte >> 4] + HEX_CHARS[byte & 0xf];
    }
  }
  return hex;
}

/**
 * Check if all bytes in array are zero.
 *
 * @param bytes - Byte array to check
 * @returns true if all bytes are 0x00
 */
function isAllZeros(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0) {
      return false;
    }
  }
  return true;
}

/**
 * Check if hex string is all zeros.
 *
 * @param hex - Hex string to check
 * @returns true if string contains only '0' characters
 */
function isHexAllZeros(hex: string): boolean {
  for (let i = 0; i < hex.length; i++) {
    if (hex[i] !== "0") {
      return false;
    }
  }
  return true;
}

/**
 * Generate random hex string using Math.random fallback.
 *
 * Used when crypto.getRandomValues is unavailable.
 * Suitable for development/testing but NOT cryptographically secure.
 *
 * @param length - Number of hex characters to generate
 * @returns Random hex string
 */
function generateRandomHex(length: number): string {
  let hex = "";
  for (let i = 0; i < length; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
}

/**
 * Generate a W3C Trace Context trace ID.
 *
 * Returns 32 hex characters (16 bytes) representing a globally unique trace identifier.
 * All spans within a trace share the same trace ID.
 *
 * **Format:** 32 lowercase hex chars, never all zeros
 *
 * **Example:** `'4bf92f3577b34da6a3ce929d0e0e4736'`
 *
 * **Implementation:**
 * - Prefers crypto.getRandomValues for cryptographic randomness
 * - Falls back to Math.random in environments without crypto
 * - Regenerates if result is all zeros (invalid per W3C spec)
 *
 * @returns 32-character hex trace ID
 * @public
 */
export function generateTraceId(): string {
  // Try crypto.getRandomValues (browser, Node.js 15+)
  const crypto = getCrypto();
  if (crypto) {
    let attempts = 0;
    while (attempts < 3) {
      crypto.getRandomValues(traceIdBuffer);

      if (!isAllZeros(traceIdBuffer)) {
        return bytesToHex(traceIdBuffer);
      }
      attempts++;
    }
  }

  // Fallback to Math.random
  let attempts = 0;
  while (attempts < 3) {
    const hex = generateRandomHex(32);
    if (!isHexAllZeros(hex)) {
      return hex;
    }
    attempts++;
  }

  // Last resort: use timestamp to ensure not all zeros
  const timestamp = Date.now().toString(16).padStart(32, "1");
  return timestamp.slice(0, 32);
}

/**
 * Generate a W3C Trace Context span ID.
 *
 * Returns 16 hex characters (8 bytes) representing a unique span identifier.
 * Each span has a unique ID within its trace.
 *
 * **Format:** 16 lowercase hex chars, never all zeros
 *
 * **Example:** `'00f067aa0ba902b7'`
 *
 * **Implementation:**
 * - Prefers crypto.getRandomValues for cryptographic randomness
 * - Falls back to Math.random in environments without crypto
 * - Regenerates if result is all zeros (invalid per W3C spec)
 *
 * @returns 16-character hex span ID
 * @public
 */
export function generateSpanId(): string {
  // Try crypto.getRandomValues (browser, Node.js 15+)
  const crypto = getCrypto();
  if (crypto) {
    let attempts = 0;
    while (attempts < 3) {
      crypto.getRandomValues(spanIdBuffer);

      if (!isAllZeros(spanIdBuffer)) {
        return bytesToHex(spanIdBuffer);
      }
      attempts++;
    }
  }

  // Fallback to Math.random
  let attempts = 0;
  while (attempts < 3) {
    const hex = generateRandomHex(16);
    if (!isHexAllZeros(hex)) {
      return hex;
    }
    attempts++;
  }

  // Last resort: use timestamp to ensure not all zeros
  const timestamp = Date.now().toString(16).padStart(16, "1");
  return timestamp.slice(0, 16);
}
