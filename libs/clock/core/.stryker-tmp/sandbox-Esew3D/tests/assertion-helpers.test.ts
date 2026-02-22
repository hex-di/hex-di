/**
 * Testing assertion helpers tests — DoD 31
 */
// @ts-nocheck


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
  it("assertMonotonic([1, 2, 3]) does not throw", () => {
    const values = [asMonotonic(1), asMonotonic(2), asMonotonic(3)];
    expect(() => assertMonotonic(values)).not.toThrow();
  });

  it("assertMonotonic([1, 2, 2]) throws (equal values fail)", () => {
    const values = [asMonotonic(1), asMonotonic(2), asMonotonic(2)];
    expect(() => assertMonotonic(values)).toThrow();
  });

  it("assertMonotonic([1, 3, 2]) throws (decreasing values fail)", () => {
    const values = [asMonotonic(1), asMonotonic(3), asMonotonic(2)];
    expect(() => assertMonotonic(values)).toThrow();
  });

  it("assertMonotonic([]) does not throw (empty array accepted)", () => {
    expect(() => assertMonotonic([])).not.toThrow();
  });

  it("assertMonotonic([42]) does not throw (single-element accepted)", () => {
    const values = [asMonotonic(42)];
    expect(() => assertMonotonic(values)).not.toThrow();
  });

  it("assertMonotonic error message includes index and values of failing pair", () => {
    const values = [asMonotonic(1), asMonotonic(3), asMonotonic(2)];
    expect(() => assertMonotonic(values)).toThrow(/values\[1\].*3.*values\[2\].*2/);
  });

  it("assertMonotonic error message includes custom label when provided", () => {
    const values = [asMonotonic(5), asMonotonic(3)];
    expect(() => assertMonotonic(values, "my-label")).toThrow(/my-label/);
  });
});

describe("assertTimeBetween()", () => {
  it("assertTimeBetween(150, 100, 200) does not throw", () => {
    const actual = asMonotonicDuration(150);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(() => assertTimeBetween(actual, min, max)).not.toThrow();
  });

  it("assertTimeBetween(100, 100, 200) does not throw (inclusive min)", () => {
    const actual = asMonotonicDuration(100);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(() => assertTimeBetween(actual, min, max)).not.toThrow();
  });

  it("assertTimeBetween(200, 100, 200) does not throw (inclusive max)", () => {
    const actual = asMonotonicDuration(200);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(() => assertTimeBetween(actual, min, max)).not.toThrow();
  });

  it("assertTimeBetween(250, 100, 200) throws AssertionError", () => {
    const actual = asMonotonicDuration(250);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(() => assertTimeBetween(actual, min, max)).toThrow();
  });

  it("assertTimeBetween(50, 100, 200) throws AssertionError", () => {
    const actual = asMonotonicDuration(50);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(() => assertTimeBetween(actual, min, max)).toThrow();
  });

  it("assertTimeBetween error message includes actual, min, max values", () => {
    const actual = asMonotonicDuration(250);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(() => assertTimeBetween(actual, min, max)).toThrow(/250.*100.*200/);
  });
});

describe("assertWallClockPlausible()", () => {
  it("assertWallClockPlausible(Date.now()) does not throw (current time is plausible)", () => {
    const ts = asWallClock(Date.now());
    expect(() => assertWallClockPlausible(ts)).not.toThrow();
  });

  it("assertWallClockPlausible(946684800000) throws AssertionError (year 2000, before 2020)", () => {
    const ts = asWallClock(946684800000); // 2000-01-01
    expect(() => assertWallClockPlausible(ts)).toThrow();
  });

  it("assertWallClockPlausible(Date.now() + 90000000) throws AssertionError (more than 1 day in future)", () => {
    const ts = asWallClock(Date.now() + 90000000); // ~25 hours in future
    expect(() => assertWallClockPlausible(ts)).toThrow();
  });

  it("assertWallClockPlausible(1577836800000) does not throw (exactly 2020-01-01T00:00:00Z boundary)", () => {
    const ts = asWallClock(1577836800000); // 2020-01-01T00:00:00Z
    expect(() => assertWallClockPlausible(ts)).not.toThrow();
  });

  it("assertWallClockPlausible includes custom label in error message when provided", () => {
    const ts = asWallClock(0); // Unix epoch — before 2020
    expect(() => assertWallClockPlausible(ts, "test-label")).toThrow(/test-label/);
  });
});

describe("assertSequenceOrdered()", () => {
  it("assertSequenceOrdered([1, 2, 3, 4]) does not throw (consecutive)", () => {
    expect(() => assertSequenceOrdered([1, 2, 3, 4])).not.toThrow();
  });

  it("assertSequenceOrdered([1, 2, 2, 3]) throws AssertionError (duplicate detected, gap = 0)", () => {
    expect(() => assertSequenceOrdered([1, 2, 2, 3])).toThrow();
  });

  it("assertSequenceOrdered([1, 2, 5, 6]) throws AssertionError (gap of 3 detected)", () => {
    expect(() => assertSequenceOrdered([1, 2, 5, 6])).toThrow();
  });

  it("assertSequenceOrdered([]) does not throw (empty array accepted)", () => {
    expect(() => assertSequenceOrdered([])).not.toThrow();
  });

  it("assertSequenceOrdered([42]) does not throw (single-element accepted)", () => {
    expect(() => assertSequenceOrdered([42])).not.toThrow();
  });

  it("assertSequenceOrdered error message includes gap size and index", () => {
    expect(() => assertSequenceOrdered([1, 2, 5])).toThrow(/gap.*3|3.*gap/i);
  });
});

// =============================================================================
// Mutation score improvement — specific error message content
// =============================================================================

describe("assertMonotonic — error message content", () => {
  it("error message contains 'Monotonic assertion failed'", () => {
    const values = [asMonotonic(1), asMonotonic(3), asMonotonic(2)];
    expect(() => assertMonotonic(values)).toThrow(/Monotonic assertion failed/);
  });
});

describe("assertTimeBetween — error message content", () => {
  afterEach(() => vi.restoreAllMocks());

  it("error message contains 'Time assertion failed' (no label)", () => {
    const actual = asMonotonicDuration(50);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(() => assertTimeBetween(actual, min, max)).toThrow(/Time assertion failed/);
  });

  it("error message contains 'Time assertion failed' with custom label", () => {
    const actual = asMonotonicDuration(50);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(() => assertTimeBetween(actual, min, max, "my-label")).toThrow(
      /Time assertion failed.*my-label/
    );
  });
});

describe("assertWallClockPlausible — error message content", () => {
  afterEach(() => vi.restoreAllMocks());

  it("before-2020 error contains 'Wall-clock assertion failed' (no label)", () => {
    const ts = asWallClock(946684800000); // 2000-01-01
    expect(() => assertWallClockPlausible(ts)).toThrow(/Wall-clock assertion failed/);
  });

  it("before-2020 error contains 'Wall-clock assertion failed' with label", () => {
    const ts = asWallClock(0); // Unix epoch
    expect(() => assertWallClockPlausible(ts, "my-label")).toThrow(
      /Wall-clock assertion failed.*my-label/
    );
  });

  it("future error contains 'more than 1 day in the future' (no label)", () => {
    const ts = asWallClock(Date.now() + 90000000);
    expect(() => assertWallClockPlausible(ts)).toThrow(/more than 1 day in the future/);
  });

  it("future error contains 'Wall-clock assertion failed' (no label)", () => {
    const ts = asWallClock(Date.now() + 90000000);
    expect(() => assertWallClockPlausible(ts)).toThrow(/Wall-clock assertion failed/);
  });

  it("does NOT throw when timestamp equals exactly Date.now() + ONE_DAY_MS (kills >= mutant)", () => {
    const fixedNow = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(fixedNow);
    const ONE_DAY_MS = 86400000;
    const ts = asWallClock(fixedNow + ONE_DAY_MS); // exactly maxAllowed
    // original (>): timestamp > maxAllowed → false → no throw
    // mutant (>=): timestamp >= maxAllowed → true → throws
    expect(() => assertWallClockPlausible(ts)).not.toThrow();
  });

  it("future error with label contains 'Wall-clock assertion failed' (covers L57 NoCoverage)", () => {
    // L57 is the labeled branch of the future-timestamp error — only reached with both future ts AND a label
    const ts = asWallClock(Date.now() + 90000000);
    expect(() => assertWallClockPlausible(ts, "ts-label")).toThrow(
      /Wall-clock assertion failed.*ts-label/
    );
  });
});

describe("assertSequenceOrdered — error message content", () => {
  it("error message contains 'Sequence assertion failed' (no label)", () => {
    expect(() => assertSequenceOrdered([1, 2, 5])).toThrow(/Sequence assertion failed/);
  });

  it("error message contains 'Sequence assertion failed' with label", () => {
    expect(() => assertSequenceOrdered([1, 2, 5], "seq-label")).toThrow(
      /Sequence assertion failed.*seq-label/
    );
  });

  it("error message contains exact second-element value 'values[2] (5)' (kills i-1 mutation)", () => {
    // [1, 2, 5]: failing at i=1: values[1]=2, values[2]=5
    // original: "-> values[2] (5)"; mutant(i-1 for index): "-> values[0] (5)"
    // mutant(i-1 for value): "-> values[2] (1)"
    expect(() => assertSequenceOrdered([1, 2, 5])).toThrow(/values\[2\] \(5\)/);
  });
});
