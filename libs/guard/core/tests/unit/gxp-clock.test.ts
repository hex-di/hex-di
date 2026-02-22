import { describe, it, expect } from "vitest";
import { SystemClock } from "../../src/guard/types.js";
import type { ClockSource } from "../../src/guard/types.js";

describe("SystemClock", () => {
  it("now() produces ISO 8601 UTC format", () => {
    const clock = new SystemClock();
    const result = clock.now();
    // ISO 8601 UTC: ends with Z
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("now() produces values parseable as dates", () => {
    const clock = new SystemClock();
    const result = clock.now();
    const parsed = Date.parse(result);
    expect(isNaN(parsed)).toBe(false);
  });

  it("can be used as ClockSource", () => {
    const clock: ClockSource = new SystemClock();
    const result = clock.now();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("two SystemClock.now() calls return different or equal values (monotonic)", () => {
    const clock = new SystemClock();
    const t1 = clock.now();
    const t2 = clock.now();
    // t2 must be >= t1 (monotonic)
    expect(t2 >= t1).toBe(true);
  });

  it("now() returns current time within reasonable bounds", () => {
    const before = Date.now();
    const clock = new SystemClock();
    const result = clock.now();
    const after = Date.now();
    const parsed = Date.parse(result);
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  it("creates a new instance each time and produces valid output", () => {
    const c1 = new SystemClock();
    const c2 = new SystemClock();
    expect(c1.now()).toMatch(/Z$/);
    expect(c2.now()).toMatch(/Z$/);
  });
});
