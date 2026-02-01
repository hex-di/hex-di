/**
 * Deterministic sequence generator for test isolation.
 *
 * Replaces Date.now() in mocks to ensure reproducible test ordering.
 * Call resetSequence() in beforeEach to isolate tests.
 *
 * @packageDocumentation
 */

let sequence = 0;

/**
 * Resets the sequence counter to 0.
 * Call this in beforeEach() to ensure test isolation.
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   resetSequence();
 * });
 * ```
 */
export function resetSequence(): void {
  sequence = 0;
}

/**
 * Returns the next sequence number (auto-incrementing).
 * Use instead of Date.now() for deterministic ordering.
 *
 * @returns The next sequence number, starting from 1
 *
 * @example
 * ```typescript
 * const tracker = createCallTracker(service);
 * // Internally uses nextSequence() instead of Date.now()
 * tracker.service.doSomething();
 * expect(tracker.getCalls()[0].timestamp).toBe(1);
 * ```
 */
export function nextSequence(): number {
  return ++sequence;
}

/**
 * Returns the current sequence value without incrementing.
 * Useful for assertions about the current state.
 *
 * @returns The current sequence number
 */
export function currentSequence(): number {
  return sequence;
}
