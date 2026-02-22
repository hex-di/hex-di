/**
 * Temporal API interop type-level tests — DoD 29
 */

import { describe, it, expectTypeOf } from "vitest";
import { toTemporalInstant, fromTemporalInstant } from "../src/temporal-interop.js";
import type { TemporalUnavailableError } from "../src/temporal-interop.js";
import { asWallClock, asHighRes } from "../src/branded.js";
import type {
  WallClockTimestamp,
  HighResTimestamp,
  MonotonicTimestamp,
} from "../src/branded.js";
import type { Result } from "@hex-di/result";

// Minimal Temporal.Instant-like type for type checking
interface TemporalInstantLike {
  readonly epochMilliseconds: bigint;
}

// =============================================================================
// DoD 29: Temporal API Interop — type-level
// =============================================================================

describe("Temporal interop type signatures", () => {
  it("toTemporalInstant accepts WallClockTimestamp", () => {
    const wall = asWallClock(Date.now());
    // Verify WallClockTimestamp is assignable to the parameter type of toTemporalInstant
    expectTypeOf<WallClockTimestamp>().toMatchTypeOf<Parameters<typeof toTemporalInstant>[0]>();
    expectTypeOf(wall).toMatchTypeOf<Parameters<typeof toTemporalInstant>[0]>();
  });

  it("toTemporalInstant accepts HighResTimestamp", () => {
    const highRes = asHighRes(Date.now());
    // Verify HighResTimestamp is assignable to the parameter type of toTemporalInstant
    expectTypeOf<HighResTimestamp>().toMatchTypeOf<Parameters<typeof toTemporalInstant>[0]>();
    expectTypeOf(highRes).toMatchTypeOf<Parameters<typeof toTemporalInstant>[0]>();
  });

  it("toTemporalInstant does NOT accept MonotonicTimestamp (compile error)", () => {
    // MonotonicTimestamp is not assignable to WallClockTimestamp | HighResTimestamp
    expectTypeOf<MonotonicTimestamp>().not.toMatchTypeOf<WallClockTimestamp>();
    expectTypeOf<MonotonicTimestamp>().not.toMatchTypeOf<HighResTimestamp>();
    expectTypeOf<MonotonicTimestamp>().not.toMatchTypeOf<
      Parameters<typeof toTemporalInstant>[0]
    >();
  });

  it("fromTemporalInstant return type is Result<WallClockTimestamp, TemporalUnavailableError>", () => {
    expectTypeOf(fromTemporalInstant).returns.toEqualTypeOf<
      Result<WallClockTimestamp, TemporalUnavailableError>
    >();
  });

  it("toTemporalInstant returns Result containing an object with epochMilliseconds", () => {
    // toTemporalInstant returns Result<TemporalInstantLike, TemporalUnavailableError>
    // We verify the return is a Result (not a plain object)
    const result = toTemporalInstant(asWallClock(1707753600000));
    expectTypeOf(result).toMatchTypeOf<Result<TemporalInstantLike, TemporalUnavailableError>>();
  });

  it("fromTemporalInstant accepts an object with epochMilliseconds bigint field", () => {
    const instant: TemporalInstantLike = { epochMilliseconds: BigInt(Date.now()) };
    expectTypeOf(instant).toMatchTypeOf<Parameters<typeof fromTemporalInstant>[0]>();
  });
});
