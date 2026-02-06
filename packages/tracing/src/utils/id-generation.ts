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

/**
 * Convert byte array to hex string.
 *
 * @param bytes - Byte array to convert
 * @returns Lowercase hex string (2 chars per byte)
 */
function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      hex += byte.toString(16).padStart(2, "0");
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
  if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
    const maybeGlobal: unknown = globalThis;
    if (maybeGlobal && typeof maybeGlobal === "object" && "crypto" in maybeGlobal) {
      const crypto: unknown = maybeGlobal.crypto;
      if (
        crypto &&
        typeof crypto === "object" &&
        "getRandomValues" in crypto &&
        typeof crypto.getRandomValues === "function"
      ) {
        let attempts = 0;
        while (attempts < 3) {
          const bytes = new Uint8Array(16);
          crypto.getRandomValues(bytes);

          if (!isAllZeros(bytes)) {
            return bytesToHex(bytes);
          }
          attempts++;
        }
      }
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
  if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
    const maybeGlobal: unknown = globalThis;
    if (maybeGlobal && typeof maybeGlobal === "object" && "crypto" in maybeGlobal) {
      const crypto: unknown = maybeGlobal.crypto;
      if (
        crypto &&
        typeof crypto === "object" &&
        "getRandomValues" in crypto &&
        typeof crypto.getRandomValues === "function"
      ) {
        let attempts = 0;
        while (attempts < 3) {
          const bytes = new Uint8Array(8);
          crypto.getRandomValues(bytes);

          if (!isAllZeros(bytes)) {
            return bytesToHex(bytes);
          }
          attempts++;
        }
      }
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
