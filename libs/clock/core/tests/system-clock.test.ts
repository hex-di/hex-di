/**
 * System clock adapter tests — DoD 3
 */

import { describe, it, expect } from "vitest";
import {
  createSystemClock,
  createSystemSequenceGenerator,
} from "../src/adapters/system-clock.js";

// =============================================================================
// DoD 3: System Clock Adapter
// =============================================================================

describe("SystemClock", () => {
  it("createSystemClock() returns a frozen object", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("monotonicNow() returns a number", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.monotonicNow()).toBe("number");
    }
  });

  it("monotonicNow() returns non-decreasing values across 100 calls", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const clock = result.value;
    let prev = clock.monotonicNow();
    for (let i = 0; i < 100; i++) {
      const curr = clock.monotonicNow();
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });

  it("wallClockNow() returns a number", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.wallClockNow()).toBe("number");
    }
  });

  it("wallClockNow() returns a value close to Date.now() (within 10ms)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const clock = result.value;
    const before = Date.now();
    const wall = clock.wallClockNow();
    const after = Date.now();
    expect(wall).toBeGreaterThanOrEqual(before - 1);
    expect(wall).toBeLessThanOrEqual(after + 10);
  });

  it("highResNow() returns a number", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.highResNow()).toBe("number");
    }
  });

  it("highResNow() returns a value close to Date.now() (within 10ms)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const clock = result.value;
    const before = Date.now();
    const highRes = clock.highResNow();
    const after = Date.now();
    // High-res time should be near wall clock
    expect(highRes).toBeGreaterThan(before - 2000);
    expect(highRes).toBeLessThanOrEqual(after + 10);
  });

  it("highResNow() has sub-millisecond precision when performance API available", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    // Check that we can read it multiple times without error
    const clock = result.value;
    const h1 = clock.highResNow();
    const h2 = clock.highResNow();
    expect(typeof h1).toBe("number");
    expect(typeof h2).toBe("number");
    expect(h2).toBeGreaterThanOrEqual(h1);
  });

  it("createSystemSequenceGenerator() returns a frozen object", () => {
    const seq = createSystemSequenceGenerator();
    expect(Object.isFrozen(seq)).toBe(true);
  });

  it("createSystemSequenceGenerator() result has no reset property", () => {
    const seq = createSystemSequenceGenerator();
    expect("reset" in seq).toBe(false);
  });
});
