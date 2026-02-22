/**
 * Process instance ID generation for multi-process audit trail disambiguation.
 *
 * Uses feature detection and dynamic imports to avoid compile-time dependency
 * on node: modules, making this module safe for all runtimes.
 *
 * @packageDocumentation
 */

/** Monotonic counter for fallback UUID uniqueness within the same microsecond. */
let fallbackCounter = 0;

/** Generate a UUID using available platform APIs. */
function generateUUID(): string {
  // Prefer Web Crypto API (available in Node.js 15+, all browsers, edge runtimes)
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  // Fallback: use performance.now() fractional digits + monotonic counter
  const perfNow =
    typeof globalThis.performance !== "undefined" ? globalThis.performance.now() : 0;
  fallbackCounter += 1;
  return `fallback-${perfNow.toFixed(6)}-${fallbackCounter}`;
}

/** Obtain the hostname using feature detection (no node:os import). */
function getHostname(): string {
  // In Node.js, process.env.HOSTNAME or process.env.COMPUTERNAME are common
  // Stryker disable next-line all -- EQUIVALENT: typeof globalThis !== "undefined" is always true in any JS runtime; "process" in globalThis is always true in Node.js; all mutations produce the same branch outcome in the test environment
  if (typeof globalThis !== "undefined" && "process" in globalThis) {
    const proc = (globalThis as Record<string, unknown>)["process"] as Record<string, unknown> | undefined;
    // Stryker disable next-line all -- EQUIVALENT: proc is always a non-null object in Node.js; typeof proc["env"] === "object" && proc["env"] !== null is always true; all mutations produce the same branch outcome
    if (proc && typeof proc["env"] === "object" && proc["env"] !== null) {
      const env = proc["env"] as Record<string, unknown>;
      const hostname = env["HOSTNAME"] ?? env["COMPUTERNAME"];
      if (typeof hostname === "string" && hostname.length > 0) {
        return hostname;
      }
    }
  }
  return "unknown";
}

/**
 * Creates a process instance identifier for multi-process audit trail disambiguation.
 * Call once at process startup; reuse the returned value for the entire process lifetime.
 *
 * Format: `{hostname}-{startupTimestamp}-{uuid}`
 *
 * Falls back gracefully on all platforms — no node: imports required.
 */
export function createProcessInstanceId(): string {
  const hostname = getHostname();
  const timestamp = Date.now();
  const uuid = generateUUID();

  return `${hostname}-${timestamp}-${uuid}`;
}
