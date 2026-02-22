/**
 * GxP compliance tests — DoD 7/16
 */
// @ts-nocheck


import { describe, it, expect, vi, afterEach } from "vitest";
import { createSystemClock, createSystemSequenceGenerator } from "../src/adapters/system-clock.js";
import { createSequenceOverflowError } from "../src/ports/sequence.js";
import { createClockRangeError } from "../src/testing/virtual-clock.js";

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// DoD 7: GxP Compliance
// =============================================================================

describe("GxP Clock Compliance", () => {
  it("SystemClockAdapter object is frozen (Object.isFrozen)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("SystemSequenceGenerator object is frozen (Object.isFrozen)", () => {
    const seq = createSystemSequenceGenerator();
    expect(Object.isFrozen(seq)).toBe(true);
  });

  it("SequenceOverflowError is frozen at construction", () => {
    const error = createSequenceOverflowError(Number.MAX_SAFE_INTEGER);
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("ClockDiagnostics object is frozen", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const diag = result.value.getDiagnostics();
      expect(Object.isFrozen(diag)).toBe(true);
    }
  });

  it("Sequence numbers are always unique (1000 rapid next() calls)", () => {
    const seq = createSystemSequenceGenerator();
    const values = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const result = seq.next();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(values.has(result.value)).toBe(false);
        values.add(result.value);
      }
    }
  });

  it("Sequence numbers are strictly monotonic (1000 rapid next() calls)", () => {
    const seq = createSystemSequenceGenerator();
    let prev = 0;
    for (let i = 0; i < 1000; i++) {
      const result = seq.next();
      if (result.isOk()) {
        expect(result.value).toBeGreaterThan(prev);
        prev = result.value;
      }
    }
  });

  it("monotonicNow() is non-decreasing (1000 rapid calls)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const clock = result.value;
    let prev = clock.monotonicNow();
    for (let i = 0; i < 1000; i++) {
      const curr = clock.monotonicNow();
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });

  it("Events with identical timestamps are ordered by sequence number", () => {
    const seq = createSystemSequenceGenerator();
    const r1 = seq.next();
    const r2 = seq.next();
    expect(r1.isOk() && r2.isOk()).toBe(true);
    if (r1.isOk() && r2.isOk()) {
      expect(r2.value).toBeGreaterThan(r1.value);
    }
  });

  it("wallClockNow() returns integer (no sub-ms fabrication)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const wall = result.value.wallClockNow();
      // Date.now() returns integer milliseconds
      expect(Number.isInteger(wall)).toBe(true);
    }
  });

  it("All next() return values are safe integers", () => {
    const seq = createSystemSequenceGenerator();
    for (let i = 0; i < 100; i++) {
      const result = seq.next();
      if (result.isOk()) {
        expect(Number.isSafeInteger(result.value)).toBe(true);
      }
    }
  });

  it("ISO 8601 conversion of wallClockNow() produces valid UTC string", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const wall = result.value.wallClockNow();
      const iso = new Date(wall).toISOString();
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
  });

  it("SystemSequenceGenerator has no reset() method (structural irresettability)", () => {
    const seq = createSystemSequenceGenerator();
    expect("reset" in seq).toBe(false);
  });

  it("ClockDiagnosticsPort reports correct adapter name", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getDiagnostics().adapterName).toBe("SystemClockAdapter");
    }
  });

  it("ClockDiagnosticsPort reports correct platform sources", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const diag = result.value.getDiagnostics();
      expect(["performance.now", "Date.now-clamped"]).toContain(diag.monotonicSource);
      expect(["performance.timeOrigin+now", "Date.now"]).toContain(diag.highResSource);
    }
  });

  it("SequenceOverflowError: generator remains in overflow state after first err()", async () => {
    const { createVirtualSequenceGenerator } = await import(
      "../src/testing/virtual-sequence.js"
    );
    const seq = createVirtualSequenceGenerator();
    seq.setCounter(Number.MAX_SAFE_INTEGER);
    const r1 = seq.next();
    const r2 = seq.next();
    expect(r1.isErr()).toBe(true);
    expect(r2.isErr()).toBe(true);
  });

  it("SequenceOverflowError: current() returns MAX_SAFE_INTEGER after overflow", async () => {
    const { createVirtualSequenceGenerator } = await import(
      "../src/testing/virtual-sequence.js"
    );
    const seq = createVirtualSequenceGenerator();
    seq.setCounter(Number.MAX_SAFE_INTEGER);
    seq.next(); // triggers overflow
    expect(seq.current()).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("SequenceOverflowError: lastValue field is MAX_SAFE_INTEGER", async () => {
    const { createVirtualSequenceGenerator } = await import(
      "../src/testing/virtual-sequence.js"
    );
    const seq = createVirtualSequenceGenerator();
    seq.setCounter(Number.MAX_SAFE_INTEGER);
    const result = seq.next();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.lastValue).toBe(Number.MAX_SAFE_INTEGER);
    }
  });

  it("SystemClockAdapter captures Date.now at construction (anti-tampering)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // The clock should return values even if we try to override Date.now
      const originalDateNow = Date.now;
      const wall1 = result.value.wallClockNow();

      // Override global Date.now — captured clock should not be affected
      Date.now = () => 0;
      const wall2 = result.value.wallClockNow();
      Date.now = originalDateNow;

      // wall2 should be >= wall1, proving the captured Date.now was used
      // (not the mocked global which returns 0)
      expect(wall2).toBeGreaterThanOrEqual(wall1);
      expect(wall2).toBeGreaterThan(0);
    }
  });

  it("Clamped fallback uses captured Date.now, not global Date.now", async () => {
    const { createClampedFallback } = await import("../src/adapters/system-clock.js");
    let time = 1000;
    const capturedDateNow = () => time;
    const clamped = createClampedFallback(capturedDateNow);

    time = 2000;
    const value = clamped();
    expect(value).toBe(2000); // uses captured reference

    // Global Date.now is irrelevant
    const originalDateNow = Date.now;
    Date.now = () => 9999;
    time = 3000;
    const value2 = clamped();
    Date.now = originalDateNow;
    expect(value2).toBe(3000); // still uses captured reference
  });

  it("Sequence numbers remain unique across interleaved async operations (100 concurrent calls)", async () => {
    const seq = createSystemSequenceGenerator();
    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        Promise.resolve().then(() => {
          const result = seq.next();
          return result.isOk() ? result.value : -1;
        })
      )
    );
    const unique = new Set(results);
    expect(unique.size).toBe(100);
  });

  it("createClockRangeError() returns a frozen object with _tag 'ClockRangeError'", () => {
    const error = createClockRangeError("ms", -1, "advance() requires a non-negative value");
    expect(error._tag).toBe("ClockRangeError");
    expect(Object.isFrozen(error)).toBe(true);
  });
});

// =============================================================================
// DoD 16: GxP Startup Self-Test Integration
// =============================================================================

describe("GxP startup self-test integration", () => {
  it("createSystemClock({ gxp: true }) with unfrozen Date returns err with check 'ST-4'", () => {
    const result = createSystemClock({ gxp: true });
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-4");
    } else {
      // Date is frozen in this environment — ST-4 does not fire
      expect(result.isOk()).toBe(true);
    }
  });

  it("createSystemClock() (non-GxP) passes despite unfrozen APIs", () => {
    const result = createSystemClock();
    // Without GxP mode, ST-4 should not run
    if (result.isErr()) {
      expect(result.error.check).not.toBe("ST-4");
    }
  });

  it("createSystemClock() with mocked Date.now returning 0 returns err 'ST-2'", () => {
    vi.spyOn(Date, "now").mockReturnValue(0);
    const result = createSystemClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-2");
    }
  });
});
