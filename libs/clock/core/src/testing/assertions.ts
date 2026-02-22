/**
 * Testing assertion helpers for clock-related test conditions.
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import type { MonotonicTimestamp, MonotonicDuration, WallClockTimestamp } from "../branded.js";

/** Error returned when a clock assertion fails. */
export interface ClockAssertionError {
  readonly _tag: "ClockAssertionError";
  readonly kind: "monotonic" | "timeBetween" | "wallClockPlausible" | "sequenceOrdered";
  readonly message: string;
}

/** Factory for ClockAssertionError — frozen per GxP error immutability. */
export function createClockAssertionError(
  kind: ClockAssertionError["kind"],
  message: string
): ClockAssertionError {
  return Object.freeze({
    _tag: "ClockAssertionError" as const,
    kind,
    message,
  });
}

/** Checks that the array of MonotonicTimestamp values is strictly increasing. */
export function assertMonotonic(
  values: ReadonlyArray<MonotonicTimestamp>,
  label?: string
): Result<void, ClockAssertionError> {
  // Stryker disable next-line all -- EQUIVALENT: single-element array has no adjacent pairs; the loop body is unreachable regardless of the early-return condition
  if (values.length <= 1) return ok(undefined);

  // Stryker disable next-line EqualityOperator,ArithmeticOperator -- EQUIVALENT: off-by-one accesses values[length-1+1]=undefined; undefined comparison returns false; no error thrown
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] >= values[i + 1]) {
      const prefix = label ? `Monotonic assertion failed (${label})` : "Monotonic assertion failed";
      return err(
        createClockAssertionError(
          "monotonic",
          `${prefix}: values[${i}] (${values[i]}) >= values[${i + 1}] (${values[i + 1]})`
        )
      );
    }
  }
  return ok(undefined);
}

/** Checks that actual falls within [min, max] inclusive. */
export function assertTimeBetween(
  actual: MonotonicDuration,
  min: MonotonicDuration,
  max: MonotonicDuration,
  label?: string
): Result<void, ClockAssertionError> {
  if (actual < min || actual > max) {
    const prefix = label ? `Time assertion failed (${label})` : "Time assertion failed";
    return err(
      createClockAssertionError(
        "timeBetween",
        `${prefix}: ${actual}ms not in [${min}ms, ${max}ms]`
      )
    );
  }
  return ok(undefined);
}

/** Checks that the wall-clock timestamp is plausible (after 2020, not more than 1 day in future). */
export function assertWallClockPlausible(
  timestamp: WallClockTimestamp,
  label?: string
): Result<void, ClockAssertionError> {
  const Y2020 = 1577836800000;
  const ONE_DAY_MS = 86400000;

  if (timestamp < Y2020) {
    const prefix = label
      ? `Wall-clock assertion failed (${label})`
      : "Wall-clock assertion failed";
    return err(
      createClockAssertionError(
        "wallClockPlausible",
        `${prefix}: ${timestamp} is before 2020-01-01`
      )
    );
  }

  const maxAllowed = Date.now() + ONE_DAY_MS;
  if (timestamp > maxAllowed) {
    const prefix = label
      ? `Wall-clock assertion failed (${label})`
      : "Wall-clock assertion failed";
    return err(
      createClockAssertionError(
        "wallClockPlausible",
        `${prefix}: ${timestamp} is more than 1 day in the future`
      )
    );
  }

  return ok(undefined);
}

/** Checks that the array of sequence numbers is strictly increasing by exactly 1 (consecutive). */
export function assertSequenceOrdered(
  values: ReadonlyArray<number>,
  label?: string
): Result<void, ClockAssertionError> {
  // Stryker disable next-line all -- EQUIVALENT: single-element array has no adjacent pairs; the loop body is unreachable regardless of the early-return condition
  if (values.length <= 1) return ok(undefined);

  for (let i = 0; i < values.length - 1; i++) {
    const gap = values[i + 1] - values[i];
    if (gap !== 1) {
      const prefix = label
        ? `Sequence assertion failed (${label})`
        : "Sequence assertion failed";
      return err(
        createClockAssertionError(
          "sequenceOrdered",
          `${prefix}: values[${i}] (${values[i]}) -> values[${i + 1}] (${values[i + 1]}): gap of ${gap}, expected 1`
        )
      );
    }
  }
  return ok(undefined);
}
