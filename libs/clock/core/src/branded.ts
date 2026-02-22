/**
 * Phantom branded timestamp and duration types for @hex-di/clock.
 *
 * Zero runtime cost — brands exist only at the TypeScript type level.
 * All branding utilities are identity functions at runtime.
 *
 * @packageDocumentation
 */

import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { ClockService } from "./ports/clock.js";

// =============================================================================
// Unique Symbol Brands (opaque, unforgeable)
// =============================================================================

declare const MonotonicBrand: unique symbol;
declare const WallClockBrand: unique symbol;
declare const HighResBrand: unique symbol;
declare const MonotonicDurationBrand: unique symbol;
declare const WallClockDurationBrand: unique symbol;

// =============================================================================
// Branded Timestamp Types
// =============================================================================

/** Monotonic timestamp in milliseconds, relative to process start. Never decreases. */
export type MonotonicTimestamp = number & { readonly [MonotonicBrand]: never };

/** Wall-clock timestamp in milliseconds since Unix epoch. May jump with NTP. */
export type WallClockTimestamp = number & { readonly [WallClockBrand]: never };

/** High-resolution timestamp: performance.timeOrigin + performance.now() in milliseconds. */
export type HighResTimestamp = number & { readonly [HighResBrand]: never };

// =============================================================================
// Branded Duration Types
// =============================================================================

/** Monotonic elapsed time in milliseconds. Immune to NTP jumps. */
export type MonotonicDuration = number & { readonly [MonotonicDurationBrand]: never };

/** Wall-clock elapsed time in milliseconds. May go negative on NTP backward correction. */
export type WallClockDuration = number & { readonly [WallClockDurationBrand]: never };

// =============================================================================
// Zero-Cost Identity Branding (no validation, no runtime cost)
// =============================================================================

/** Brand a number as MonotonicTimestamp. Use only at system boundaries. */
export function asMonotonic(ms: number): MonotonicTimestamp {
  return ms as MonotonicTimestamp;
}

/** Brand a number as WallClockTimestamp. Use only at system boundaries. */
export function asWallClock(ms: number): WallClockTimestamp {
  return ms as WallClockTimestamp;
}

/** Brand a number as HighResTimestamp. Use only at system boundaries. */
export function asHighRes(ms: number): HighResTimestamp {
  return ms as HighResTimestamp;
}

/** Brand a number as MonotonicDuration. Use only at system boundaries. */
export function asMonotonicDuration(ms: number): MonotonicDuration {
  return ms as MonotonicDuration;
}

/** Brand a number as WallClockDuration. Use only at system boundaries. */
export function asWallClockDuration(ms: number): WallClockDuration {
  return ms as WallClockDuration;
}

// =============================================================================
// Validated Branding (Result-returning, with plausibility checks)
// =============================================================================

/** Error returned when validated branding fails a plausibility check. */
export interface BrandingValidationError {
  readonly _tag: "BrandingValidationError";
  readonly expectedDomain: "monotonic" | "wallClock" | "highRes";
  readonly value: number;
  readonly message: string;
}

/** Factory for BrandingValidationError — frozen per GxP error immutability. */
export function createBrandingValidationError(
  expectedDomain: BrandingValidationError["expectedDomain"],
  value: number,
  message: string
): BrandingValidationError {
  return Object.freeze({
    _tag: "BrandingValidationError" as const,
    expectedDomain,
    value,
    message,
  });
}

/**
 * Validated branding for MonotonicTimestamp.
 * Rejects negative values and values >= 1e12 (~31 years from process start).
 */
export function asMonotonicValidated(
  ms: number
): Result<MonotonicTimestamp, BrandingValidationError> {
  if (ms < 0) {
    return err(
      createBrandingValidationError(
        "monotonic",
        ms,
        `Monotonic timestamp must be >= 0, got ${ms}`
      )
    );
  }
  if (ms >= 1e12) {
    return err(
      createBrandingValidationError(
        "monotonic",
        ms,
        `Monotonic timestamp must be < 1e12 (31 years from process start), got ${ms}`
      )
    );
  }
  return ok(ms as MonotonicTimestamp);
}

/** Year 2000 Unix timestamp in milliseconds */
const Y2K_MS = 946684800000;
/** One day in milliseconds */
const ONE_DAY_MS = 86400000;

/**
 * Validated branding for WallClockTimestamp.
 * Rejects values before Y2K and values more than 1 day in the future.
 */
export function asWallClockValidated(
  ms: number
): Result<WallClockTimestamp, BrandingValidationError> {
  if (ms < Y2K_MS) {
    return err(
      createBrandingValidationError(
        "wallClock",
        ms,
        `Wall-clock timestamp must be >= ${Y2K_MS} (2000-01-01), got ${ms}`
      )
    );
  }
  const maxAllowed = Date.now() + ONE_DAY_MS;
  if (ms > maxAllowed) {
    return err(
      createBrandingValidationError(
        "wallClock",
        ms,
        `Wall-clock timestamp must be <= 1 day in the future (${maxAllowed}), got ${ms}`
      )
    );
  }
  return ok(ms as WallClockTimestamp);
}

/**
 * Validated branding for HighResTimestamp.
 * Same rules as asWallClockValidated.
 */
export function asHighResValidated(
  ms: number
): Result<HighResTimestamp, BrandingValidationError> {
  if (ms < Y2K_MS) {
    return err(
      createBrandingValidationError(
        "highRes",
        ms,
        `High-res timestamp must be >= ${Y2K_MS} (2000-01-01), got ${ms}`
      )
    );
  }
  const maxAllowed = Date.now() + ONE_DAY_MS;
  if (ms > maxAllowed) {
    return err(
      createBrandingValidationError(
        "highRes",
        ms,
        `High-res timestamp must be <= 1 day in the future (${maxAllowed}), got ${ms}`
      )
    );
  }
  return ok(ms as HighResTimestamp);
}

// =============================================================================
// Duration Utilities
// =============================================================================

/**
 * Compute elapsed monotonic duration since a prior monotonic timestamp.
 * Preferred over asMonotonicDuration(clock.monotonicNow() - start) for clarity.
 */
export function elapsed(
  clock: ClockService,
  since: MonotonicTimestamp
): MonotonicDuration {
  return asMonotonicDuration(clock.monotonicNow() - since);
}

/** Returns true if monotonic duration a > b. */
export function durationGt(
  a: MonotonicDuration,
  b: MonotonicDuration
): boolean {
  return a > b;
}

/** Returns true if monotonic duration a < b. */
export function durationLt(
  a: MonotonicDuration,
  b: MonotonicDuration
): boolean {
  return a < b;
}

/**
 * Returns true if value is within [min, max] inclusive.
 * Note: spec signature is durationBetween(value, min, max).
 */
export function durationBetween(
  value: MonotonicDuration,
  min: MonotonicDuration,
  max: MonotonicDuration
): boolean {
  return value >= min && value <= max;
}
