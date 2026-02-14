/**
 * Monotonic sequence number generator for log entries.
 *
 * Provides globally unique, strictly increasing sequence numbers
 * for ordering log entries within a process. Essential for GxP
 * audit trail completeness where timestamp alone is insufficient.
 *
 * @packageDocumentation
 */

/**
 * Global sequence counter. Monotonically increasing, never resets
 * in production. Only `resetSequence()` resets it (for tests).
 */
let _globalSequence = 0;

/**
 * Returns the next monotonic sequence number.
 *
 * Thread-safe in single-threaded JavaScript runtimes. Each call
 * returns a strictly increasing integer starting from 1.
 *
 * @returns The next sequence number
 */
export function nextSequence(): number {
  return ++_globalSequence;
}

/**
 * Resets the sequence counter to 0.
 *
 * Intended for test teardown only. Must not be called in production.
 *
 * @internal
 */
export function resetSequence(): void {
  _globalSequence = 0;
}
