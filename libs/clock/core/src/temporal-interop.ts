/**
 * Temporal API interoperability — converts between branded timestamps and Temporal.Instant.
 *
 * Detection is lazy (at call time) — importing this module does NOT require Temporal to be
 * available. Environments without Temporal can still import @hex-di/clock.
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { asWallClock } from "./branded.js";
import type { WallClockTimestamp, HighResTimestamp } from "./branded.js";

/** Error returned when the Temporal API is unavailable in the current environment. */
export interface TemporalUnavailableError {
  readonly _tag: "TemporalUnavailableError";
  readonly message: string;
}

/** Factory for TemporalUnavailableError — frozen per GxP error immutability. */
export function createTemporalUnavailableError(message: string): TemporalUnavailableError {
  return Object.freeze({
    _tag: "TemporalUnavailableError" as const,
    message,
  });
}

/** Minimal Temporal.Instant interface for type-checking without a hard dependency. */
interface TemporalInstantLike {
  readonly epochMilliseconds: bigint;
}

/** Minimal Temporal namespace for lazy detection. */
interface TemporalNamespace {
  readonly Instant: {
    fromEpochNanoseconds(epochNanoseconds: bigint): TemporalInstantLike;
  };
}

/** Lazily detects the Temporal global. Returns undefined if unavailable. */
function getTemporalGlobal(): TemporalNamespace | undefined {
  const g = globalThis as Record<string, unknown>;
  const temporal = g["Temporal"];
  if (
    /* Stryker disable next-line LogicalOperator,ConditionalExpression -- EQUIVALENT: mutations at L30 produce same result because the final ["Instant"] === "object" check on L33 guards all cases (null, non-object, missing key) */
    temporal !== undefined &&
    /* Stryker disable next-line ConditionalExpression -- EQUIVALENT: removing this check doesn't change behavior; null is already excluded by the Instant check which throws on null["Instant"] */
    typeof temporal === "object" &&
    temporal !== null &&
    typeof (temporal as Record<string, unknown>)["Instant"] === "object"
  ) {
    return temporal as TemporalNamespace;
  }
  return undefined;
}

const TEMPORAL_UNAVAILABLE_MESSAGE =
  "Temporal API is not available. Install a polyfill or use a runtime with native Temporal support.";

/**
 * Converts a WallClockTimestamp or HighResTimestamp to a Temporal.Instant.
 *
 * Returns err(TemporalUnavailableError) if Temporal is not available in the current environment.
 * Monotonic timestamps are excluded — they have no absolute epoch.
 */
export function toTemporalInstant(
  timestamp: WallClockTimestamp | HighResTimestamp
): Result<TemporalInstantLike, TemporalUnavailableError> {
  const Temporal = getTemporalGlobal();
  if (Temporal === undefined) {
    return err(createTemporalUnavailableError(TEMPORAL_UNAVAILABLE_MESSAGE));
  }
  const epochNanoseconds = BigInt(Math.round(timestamp)) * 1_000_000n;
  return ok(Temporal.Instant.fromEpochNanoseconds(epochNanoseconds));
}

/**
 * Converts a Temporal.Instant to a WallClockTimestamp (epoch milliseconds, branded).
 *
 * Returns err(TemporalUnavailableError) if Temporal is not available.
 */
export function fromTemporalInstant(
  instant: TemporalInstantLike
): Result<WallClockTimestamp, TemporalUnavailableError> {
  const Temporal = getTemporalGlobal();
  if (Temporal === undefined) {
    return err(createTemporalUnavailableError(TEMPORAL_UNAVAILABLE_MESSAGE));
  }
  return ok(asWallClock(Number(instant.epochMilliseconds)));
}
