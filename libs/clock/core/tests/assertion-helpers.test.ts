/**
 * Testing assertion helpers tests — DoD 31
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  assertMonotonic,
  assertTimeBetween,
  assertWallClockPlausible,
  assertSequenceOrdered,
} from "../src/testing/assertions.js";
import { asMonotonic, asMonotonicDuration, asWallClock } from "../src/branded.js";

// =============================================================================
// DoD 31: Testing Assertion Helpers
// =============================================================================

describe("assertMonotonic()", () => {
  it("assertMonotonic([1, 2, 3]) returns ok", () => {
    const values = [asMonotonic(1), asMonotonic(2), asMonotonic(3)];
    expect(assertMonotonic(values).isOk()).toBe(true);
  });

  it("assertMonotonic([1, 2, 2]) returns err (equal values fail)", () => {
    const values = [asMonotonic(1), asMonotonic(2), asMonotonic(2)];
    expect(assertMonotonic(values).isErr()).toBe(true);
  });

  it("assertMonotonic([1, 3, 2]) returns err (decreasing values fail)", () => {
    const values = [asMonotonic(1), asMonotonic(3), asMonotonic(2)];
    expect(assertMonotonic(values).isErr()).toBe(true);
  });

  it("assertMonotonic([]) returns ok (empty array accepted)", () => {
    expect(assertMonotonic([]).isOk()).toBe(true);
  });

  it("assertMonotonic([42]) returns ok (single-element accepted)", () => {
    const values = [asMonotonic(42)];
    expect(assertMonotonic(values).isOk()).toBe(true);
  });

  it("assertMonotonic error message includes index and values of failing pair", () => {
    const values = [asMonotonic(1), asMonotonic(3), asMonotonic(2)];
    const result = assertMonotonic(values);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/values\[1\].*3.*values\[2\].*2/);
    }
  });

  it("assertMonotonic error message includes custom label when provided", () => {
    const values = [asMonotonic(5), asMonotonic(3)];
    const result = assertMonotonic(values, "my-label");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/my-label/);
    }
  });
});

describe("assertTimeBetween()", () => {
  it("assertTimeBetween(150, 100, 200) returns ok", () => {
    const actual = asMonotonicDuration(150);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(assertTimeBetween(actual, min, max).isOk()).toBe(true);
  });

  it("assertTimeBetween(100, 100, 200) returns ok (inclusive min)", () => {
    const actual = asMonotonicDuration(100);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(assertTimeBetween(actual, min, max).isOk()).toBe(true);
  });

  it("assertTimeBetween(200, 100, 200) returns ok (inclusive max)", () => {
    const actual = asMonotonicDuration(200);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(assertTimeBetween(actual, min, max).isOk()).toBe(true);
  });

  it("assertTimeBetween(250, 100, 200) returns err", () => {
    const actual = asMonotonicDuration(250);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(assertTimeBetween(actual, min, max).isErr()).toBe(true);
  });

  it("assertTimeBetween(50, 100, 200) returns err", () => {
    const actual = asMonotonicDuration(50);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(assertTimeBetween(actual, min, max).isErr()).toBe(true);
  });

  it("assertTimeBetween error message includes actual, min, max values", () => {
    const actual = asMonotonicDuration(250);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    const result = assertTimeBetween(actual, min, max);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/250.*100.*200/);
    }
  });
});

describe("assertWallClockPlausible()", () => {
  it("assertWallClockPlausible(Date.now()) returns ok (current time is plausible)", () => {
    const ts = asWallClock(Date.now());
    expect(assertWallClockPlausible(ts).isOk()).toBe(true);
  });

  it("assertWallClockPlausible(946684800000) returns err (year 2000, before 2020)", () => {
    const ts = asWallClock(946684800000); // 2000-01-01
    expect(assertWallClockPlausible(ts).isErr()).toBe(true);
  });

  it("assertWallClockPlausible(Date.now() + 90000000) returns err (more than 1 day in future)", () => {
    const ts = asWallClock(Date.now() + 90000000); // ~25 hours in future
    expect(assertWallClockPlausible(ts).isErr()).toBe(true);
  });

  it("assertWallClockPlausible(1577836800000) returns ok (exactly 2020-01-01T00:00:00Z boundary)", () => {
    const ts = asWallClock(1577836800000); // 2020-01-01T00:00:00Z
    expect(assertWallClockPlausible(ts).isOk()).toBe(true);
  });

  it("assertWallClockPlausible includes custom label in error message when provided", () => {
    const ts = asWallClock(0); // Unix epoch — before 2020
    const result = assertWallClockPlausible(ts, "test-label");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/test-label/);
    }
  });
});

describe("assertSequenceOrdered()", () => {
  it("assertSequenceOrdered([1, 2, 3, 4]) returns ok (consecutive)", () => {
    expect(assertSequenceOrdered([1, 2, 3, 4]).isOk()).toBe(true);
  });

  it("assertSequenceOrdered([1, 2, 2, 3]) returns err (duplicate detected, gap = 0)", () => {
    expect(assertSequenceOrdered([1, 2, 2, 3]).isErr()).toBe(true);
  });

  it("assertSequenceOrdered([1, 2, 5, 6]) returns err (gap of 3 detected)", () => {
    expect(assertSequenceOrdered([1, 2, 5, 6]).isErr()).toBe(true);
  });

  it("assertSequenceOrdered([]) returns ok (empty array accepted)", () => {
    expect(assertSequenceOrdered([]).isOk()).toBe(true);
  });

  it("assertSequenceOrdered([42]) returns ok (single-element accepted)", () => {
    expect(assertSequenceOrdered([42]).isOk()).toBe(true);
  });

  it("assertSequenceOrdered error message includes gap size and index", () => {
    const result = assertSequenceOrdered([1, 2, 5]);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/gap.*3|3.*gap/i);
    }
  });
});

// =============================================================================
// Mutation score improvement — specific error message content
// =============================================================================

describe("assertMonotonic — error message content", () => {
  it("error message contains 'Monotonic assertion failed'", () => {
    const values = [asMonotonic(1), asMonotonic(3), asMonotonic(2)];
    const result = assertMonotonic(values);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/Monotonic assertion failed/);
    }
  });
});

describe("assertTimeBetween — error message content", () => {
  afterEach(() => vi.restoreAllMocks());

  it("error message contains 'Time assertion failed' (no label)", () => {
    const actual = asMonotonicDuration(50);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    const result = assertTimeBetween(actual, min, max);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/Time assertion failed/);
    }
  });

  it("error message contains 'Time assertion failed' with custom label", () => {
    const actual = asMonotonicDuration(50);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    const result = assertTimeBetween(actual, min, max, "my-label");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/Time assertion failed.*my-label/);
    }
  });
});

describe("assertWallClockPlausible — error message content", () => {
  afterEach(() => vi.restoreAllMocks());

  it("before-2020 error contains 'Wall-clock assertion failed' (no label)", () => {
    const ts = asWallClock(946684800000); // 2000-01-01
    const result = assertWallClockPlausible(ts);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/Wall-clock assertion failed/);
    }
  });

  it("before-2020 error contains 'Wall-clock assertion failed' with label", () => {
    const ts = asWallClock(0); // Unix epoch
    const result = assertWallClockPlausible(ts, "my-label");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/Wall-clock assertion failed.*my-label/);
    }
  });

  it("future error contains 'more than 1 day in the future' (no label)", () => {
    const ts = asWallClock(Date.now() + 90000000);
    const result = assertWallClockPlausible(ts);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/more than 1 day in the future/);
    }
  });

  it("future error contains 'Wall-clock assertion failed' (no label)", () => {
    const ts = asWallClock(Date.now() + 90000000);
    const result = assertWallClockPlausible(ts);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/Wall-clock assertion failed/);
    }
  });

  it("does NOT return err when timestamp equals exactly Date.now() + ONE_DAY_MS (kills >= mutant)", () => {
    const fixedNow = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(fixedNow);
    const ONE_DAY_MS = 86400000;
    const ts = asWallClock(fixedNow + ONE_DAY_MS); // exactly maxAllowed
    // original (>): timestamp > maxAllowed → false → ok
    // mutant (>=): timestamp >= maxAllowed → true → err
    expect(assertWallClockPlausible(ts).isOk()).toBe(true);
  });

  it("future error with label contains 'Wall-clock assertion failed' (covers L57 NoCoverage)", () => {
    // L57 is the labeled branch of the future-timestamp error — only reached with both future ts AND a label
    const ts = asWallClock(Date.now() + 90000000);
    const result = assertWallClockPlausible(ts, "ts-label");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/Wall-clock assertion failed.*ts-label/);
    }
  });
});

describe("assertSequenceOrdered — error message content", () => {
  it("error message contains 'Sequence assertion failed' (no label)", () => {
    const result = assertSequenceOrdered([1, 2, 5]);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/Sequence assertion failed/);
    }
  });

  it("error message contains 'Sequence assertion failed' with label", () => {
    const result = assertSequenceOrdered([1, 2, 5], "seq-label");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/Sequence assertion failed.*seq-label/);
    }
  });

  it("error message contains exact second-element value 'values[2] (5)' (kills i-1 mutation)", () => {
    // [1, 2, 5]: failing at i=1: values[1]=2, values[2]=5
    // original: "-> values[2] (5)"; mutant(i-1 for index): "-> values[0] (5)"
    // mutant(i-1 for value): "-> values[2] (1)"
    const result = assertSequenceOrdered([1, 2, 5]);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/values\[2\] \(5\)/);
    }
  });
});
