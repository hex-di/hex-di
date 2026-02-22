/**
 * ClockSource bridge — adapts ClockPort.wallClockNow() to an ISO 8601 UTC string interface.
 *
 * Used by ecosystem monitoring libraries that require a `ClockSource` interface providing
 * ISO 8601-formatted timestamps for audit and logging integrations.
 *
 * @packageDocumentation
 */

import type { ClockService } from "./ports/clock.js";

/**
 * Interface for monitoring libraries that require ISO 8601 UTC timestamps.
 * Bridged from `ClockPort.wallClockNow()` via `createClockSourceBridge`.
 */
export interface ClockSource {
  /** Returns the current wall-clock time as an ISO 8601 UTC string (Z-suffix). */
  readonly nowISO: () => string;
}

/**
 * Creates a frozen `ClockSource` adapter that bridges `ClockPort.wallClockNow()` to the
 * ISO 8601 UTC string format expected by ecosystem monitoring libraries.
 *
 * The returned object is frozen per the GxP immutability requirement.
 *
 * @param clock - The `ClockPort` service to source time from.
 * @returns A frozen `ClockSource` whose `nowISO()` returns `new Date(clock.wallClockNow()).toISOString()`.
 */
export function createClockSourceBridge(clock: ClockService): ClockSource {
  return Object.freeze({
    nowISO: (): string => new Date(clock.wallClockNow()).toISOString(),
  });
}
