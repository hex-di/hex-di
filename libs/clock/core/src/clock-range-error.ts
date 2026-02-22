/**
 * ClockRangeError — shared error type for out-of-range clock values.
 *
 * Used by both production adapters (e.g., cached-clock) and testing utilities
 * (e.g., virtual-clock). Kept in the production source tree because ClockRangeError
 * is part of the public API surface of createCachedClock().
 *
 * @packageDocumentation
 */

/** Error returned when a clock value is out of the expected range. */
export interface ClockRangeError {
  readonly _tag: "ClockRangeError";
  readonly parameter: string;
  readonly value: number;
  readonly message: string;
}

/** Factory for ClockRangeError — frozen per GxP error immutability. */
export function createClockRangeError(
  parameter: string,
  value: number,
  message: string
): ClockRangeError {
  return Object.freeze({
    _tag: "ClockRangeError" as const,
    parameter,
    value,
    message,
  });
}
