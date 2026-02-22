/**
 * Monotonic timing — high-resolution timestamps that never go backward.
 *
 * Uses `performance.now()` as the monotonic clock source. Provides timestamp
 * clamping to ensure values never decrease, even across clock adjustments.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export interface MonotonicTimer {
  /** Get the current monotonic timestamp in milliseconds. */
  readonly now: () => number;

  /** Get the elapsed time since the timer was created, in milliseconds. */
  readonly elapsed: () => number;

  /** Get the elapsed time since a given start mark, in milliseconds. */
  readonly since: (startMark: number) => number;

  /** Create a new mark at the current time. */
  readonly mark: () => number;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create a monotonic timer that never goes backward.
 *
 * The timer uses `performance.now()` and clamps each reading to be at least
 * as large as the previous reading.
 *
 * @example
 * ```typescript
 * const timer = createMonotonicTimer();
 * const start = timer.mark();
 * // ... do work ...
 * const elapsed = timer.since(start);
 * ```
 */
export function createMonotonicTimer(): MonotonicTimer {
  const origin = performance.now();
  let lastReading = origin;

  function now(): number {
    const raw = performance.now();
    // Clamp: never go backward
    if (raw >= lastReading) {
      lastReading = raw;
    }
    return lastReading;
  }

  function elapsed(): number {
    return now() - origin;
  }

  function since(startMark: number): number {
    const current = now();
    const diff = current - startMark;
    return diff >= 0 ? diff : 0;
  }

  function mark(): number {
    return now();
  }

  return { now, elapsed, since, mark };
}
