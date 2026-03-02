/**
 * Clock Abstraction for Deterministic Timing
 *
 * Provides a pluggable clock interface for GxP-compliant deterministic
 * timestamps. All timing in the flow package flows through this interface,
 * enabling test-controlled time and audit-reproducible timestamps.
 *
 * @packageDocumentation
 */

// =============================================================================
// Clock Interface
// =============================================================================

/**
 * Abstract clock for timestamp generation.
 *
 * Production code uses SystemClock (delegates to Date.now()).
 * Tests can inject a fake clock for deterministic behavior.
 */
export interface Clock {
  /** Returns the current time in milliseconds since Unix epoch. */
  now(): number;
}
