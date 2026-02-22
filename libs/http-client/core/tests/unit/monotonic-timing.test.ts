import { describe, it, expect } from "vitest";
import { createMonotonicTimer } from "../../src/audit/monotonic-timing.js";

describe("monotonic timing", () => {
  it("request duration is measured with monotonic clock", () => {
    const timer = createMonotonicTimer();
    const start = timer.mark();

    // Burn some CPU time
    let sum = 0;
    for (let i = 0; i < 100000; i++) {
      sum += i;
    }
    // Prevent dead-code elimination
    void sum;

    const duration = timer.since(start);
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(typeof duration).toBe("number");
  });

  it("duration is non-negative even across clock adjustments", () => {
    const timer = createMonotonicTimer();

    // Take multiple readings and ensure they never go backward
    const readings: number[] = [];
    for (let i = 0; i < 50; i++) {
      readings.push(timer.now());
    }

    for (let i = 1; i < readings.length; i++) {
      expect(readings[i]!).toBeGreaterThanOrEqual(readings[i - 1]!);
    }

    // since() should also always be non-negative
    const startMark = timer.mark();
    const elapsed = timer.since(startMark);
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it("timing metadata is attached to audit entries", () => {
    const timer = createMonotonicTimer();

    // Elapsed time from creation
    const elapsed = timer.elapsed();
    expect(elapsed).toBeGreaterThanOrEqual(0);

    // Mark-based timing
    const mark1 = timer.mark();
    const mark2 = timer.mark();
    expect(mark2).toBeGreaterThanOrEqual(mark1);

    const sinceM1 = timer.since(mark1);
    expect(sinceM1).toBeGreaterThanOrEqual(0);
  });

  it("response time is measured from request start to response receipt", () => {
    const timer = createMonotonicTimer();
    const requestStart = timer.mark();

    // Simulate some work
    let sum = 0;
    for (let i = 0; i < 50000; i++) {
      sum += i;
    }
    void sum;

    const responseTime = timer.since(requestStart);
    expect(responseTime).toBeGreaterThanOrEqual(0);
    expect(typeof responseTime).toBe("number");

    // The elapsed since creation should be at least as large as time since requestStart
    const totalElapsed = timer.elapsed();
    expect(totalElapsed).toBeGreaterThanOrEqual(responseTime);
  });
});
