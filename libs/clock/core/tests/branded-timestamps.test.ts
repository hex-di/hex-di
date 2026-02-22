/**
 * Branded timestamp tests — DoD 17
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  asMonotonic,
  asWallClock,
  asHighRes,
  asMonotonicDuration,
  asWallClockDuration,
  asMonotonicValidated,
  asWallClockValidated,
  asHighResValidated,
  elapsed,
  durationGt,
  durationLt,
  durationBetween,
} from "../src/branded.js";
import type { ClockService } from "../src/ports/clock.js";

// =============================================================================
// DoD 17: Branded Timestamp Types
// =============================================================================

describe("Identity branding functions", () => {
  it("asMonotonic(42) returns 42 (identity at runtime)", () => {
    expect(asMonotonic(42)).toBe(42);
  });

  it("asWallClock(42) returns 42 (identity at runtime)", () => {
    expect(asWallClock(42)).toBe(42);
  });

  it("asHighRes(42) returns 42 (identity at runtime)", () => {
    expect(asHighRes(42)).toBe(42);
  });

  it("asMonotonic(0) returns 0 (boundary)", () => {
    expect(asMonotonic(0)).toBe(0);
  });

  it("asWallClock(Date.now()) returns the same value (real epoch)", () => {
    const now = Date.now();
    expect(asWallClock(now)).toBe(now);
  });

  it("asHighRes(performance.now()) returns the same value (real high-res)", () => {
    const now = performance.now();
    expect(asHighRes(now)).toBe(now);
  });

  it("asMonotonic(Number.MAX_SAFE_INTEGER) returns Number.MAX_SAFE_INTEGER (large values)", () => {
    expect(asMonotonic(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("Validated branding functions", () => {
  it("asMonotonicValidated returns err for negative ms", () => {
    const result = asMonotonicValidated(-1);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("BrandingValidationError");
      expect(result.error.expectedDomain).toBe("monotonic");
    }
  });

  it("asMonotonicValidated returns ok for valid ms", () => {
    const result = asMonotonicValidated(1000);
    expect(result.isOk()).toBe(true);
  });

  it("asWallClockValidated returns err for pre-Y2K timestamps", () => {
    const preY2K = 946684799999; // one ms before 2000-01-01
    const result = asWallClockValidated(preY2K);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.expectedDomain).toBe("wallClock");
    }
  });

  it("asWallClockValidated returns ok for valid timestamp", () => {
    const result = asWallClockValidated(Date.now());
    expect(result.isOk()).toBe(true);
  });

  it("asHighResValidated returns err for pre-Y2K timestamp", () => {
    const result = asHighResValidated(0);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.expectedDomain).toBe("highRes");
    }
  });

  it("asHighResValidated returns ok for valid timestamp", () => {
    const result = asHighResValidated(Date.now());
    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// Mutation score improvement — error message content
// =============================================================================

describe("asMonotonicValidated — error message content", () => {
  it("message contains '1e12' for ms >= 1e12 (kills StringLiteral mutant)", () => {
    const result = asMonotonicValidated(1e12);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("1e12");
    }
  });
});

describe("asWallClockValidated — error message content", () => {
  afterEach(() => vi.restoreAllMocks());

  it("message contains '2000-01-01' for pre-Y2K timestamp (kills StringLiteral mutant)", () => {
    const result = asWallClockValidated(946684799999); // just before Y2K
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("2000-01-01");
    }
  });

  it("message contains '1 day in the future' for far-future timestamp (kills StringLiteral mutant)", () => {
    const result = asWallClockValidated(Date.now() + 90_000_000);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("1 day in the future");
    }
  });
});

describe("asHighResValidated — error message content and boundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("message contains '2000-01-01' for pre-Y2K timestamp (kills StringLiteral mutant)", () => {
    const result = asHighResValidated(0);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("2000-01-01");
    }
  });

  it("future error has expectedDomain 'highRes' (kills StringLiteral L184 mutant)", () => {
    const result = asHighResValidated(Date.now() + 90_000_000);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.expectedDomain).toBe("highRes");
    }
  });

  it("message contains '1 day in the future' for far-future timestamp (kills StringLiteral mutant)", () => {
    const result = asHighResValidated(Date.now() + 90_000_000);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("1 day in the future");
    }
  });

  it("does NOT return err when ms === Date.now() + ONE_DAY_MS (kills >= mutant)", () => {
    const fixedNow = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(fixedNow);
    const ONE_DAY_MS = 86_400_000;
    // original (>): ms > maxAllowed → false → ok
    // mutant (>=): ms >= maxAllowed → true → err
    const result = asHighResValidated(fixedNow + ONE_DAY_MS);
    expect(result.isOk()).toBe(true);
  });
});

describe("Duration utilities", () => {
  it("elapsed() returns MonotonicDuration (numeric result)", () => {
    const clock: ClockService = {
      monotonicNow: () => asMonotonic(500),
      wallClockNow: () => asWallClock(1707753600000),
      highResNow: () => asHighRes(0),
    };
    const since = asMonotonic(100);
    const duration = elapsed(clock, since);
    expect(duration).toBe(400);
  });

  it("durationGt(a, b) returns true when a > b", () => {
    const a = asMonotonicDuration(100);
    const b = asMonotonicDuration(50);
    expect(durationGt(a, b)).toBe(true);
  });

  it("durationGt(a, b) returns false when a <= b", () => {
    const a = asMonotonicDuration(50);
    const b = asMonotonicDuration(100);
    expect(durationGt(a, b)).toBe(false);
  });

  it("durationLt(a, b) returns true when a < b", () => {
    const a = asMonotonicDuration(50);
    const b = asMonotonicDuration(100);
    expect(durationLt(a, b)).toBe(true);
  });

  it("durationBetween(value, min, max) returns true when within bounds", () => {
    const val = asMonotonicDuration(50);
    const min = asMonotonicDuration(10);
    const max = asMonotonicDuration(100);
    expect(durationBetween(val, min, max)).toBe(true);
  });

  it("durationBetween(value, min, max) returns false when outside bounds", () => {
    const val = asMonotonicDuration(200);
    const min = asMonotonicDuration(10);
    const max = asMonotonicDuration(100);
    expect(durationBetween(val, min, max)).toBe(false);
  });

  it("asMonotonicDuration is identity at runtime", () => {
    expect(asMonotonicDuration(123)).toBe(123);
  });

  it("asWallClockDuration is identity at runtime", () => {
    expect(asWallClockDuration(456)).toBe(456);
  });
});
