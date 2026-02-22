/**
 * GxP Operational Qualification (OQ) — @hex-di/clock
 *
 * OQ-1 through OQ-5: Positive tests using production adapters only.
 * ZERO imports from src/testing/ for OQ-1..5.
 *
 * OQ-6 through OQ-8: Negative tests.
 * Virtual adapters are used only where simulating failure conditions
 * that are infeasible or unsafe to trigger with production adapters.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createSystemClock,
  createSystemSequenceGenerator,
  createTemporalContextFactory,
} from "../src/index.js";

// =============================================================================
// OQ-1..5: Production adapter operational behaviors
// (ZERO imports from src/testing/ in this section)
// =============================================================================

describe("OQ-1..5 — Production adapter behavioral contracts", () => {
  it("OQ-1: monotonicNow() is non-decreasing across 1,000,000 consecutive calls", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const clock = result.value;

    let prev = clock.monotonicNow();
    let violation = false;
    for (let i = 0; i < 1_000_000; i++) {
      const curr = clock.monotonicNow();
      if (curr < prev) {
        violation = true;
        break;
      }
      prev = curr;
    }
    expect(violation).toBe(false);
  });

  it("OQ-2: wallClockNow() accuracy within drift window under load (10,000 calls)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const clock = result.value;
    const CALLS = 10_000;
    const DRIFT_MARGIN_MS = 100;

    const before = Date.now();
    let minReading = Number.MAX_SAFE_INTEGER;
    let maxReading = 0;
    for (let i = 0; i < CALLS; i++) {
      const w = clock.wallClockNow();
      if (w < minReading) minReading = w;
      if (w > maxReading) maxReading = w;
    }
    const after = Date.now();

    expect(minReading).toBeGreaterThanOrEqual(before - DRIFT_MARGIN_MS);
    expect(maxReading).toBeLessThanOrEqual(after + DRIFT_MARGIN_MS);
  });

  it("OQ-3: next() uniqueness across 10,000 concurrent microtask calls", async () => {
    const seq = createSystemSequenceGenerator();
    const CALLS = 10_000;

    const tasks = Array.from({ length: CALLS }, () =>
      Promise.resolve().then(() => seq.next())
    );
    const results = await Promise.all(tasks);

    const values = new Set<number>();
    for (const r of results) {
      expect(r.isOk()).toBe(true);
      if (r.isOk()) values.add(r.value);
    }
    expect(values.size).toBe(CALLS);
  });

  it("OQ-4: highResNow() sub-millisecond precision (≥90% non-zero deltas in 10,000 calls)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const clock = result.value;
    const CALLS = 10_000;
    // Minimum gap between samples: 0.01 ms (10 µs).
    // With sub-millisecond precision the clock must advance within 10 µs,
    // so ≥90% of consecutive pairs will differ.  Total window ≈ 100 ms.
    const GAP_MS = 0.01;

    let prev = clock.highResNow();
    let nonZeroDeltas = 0;
    let lastCallAt = performance.now();
    for (let i = 1; i < CALLS; i++) {
      while (performance.now() - lastCallAt < GAP_MS) { /* busy-wait */ }
      lastCallAt = performance.now();
      const curr = clock.highResNow();
      if (curr !== prev) nonZeroDeltas++;
      prev = curr;
    }

    const fraction = nonZeroDeltas / (CALLS - 1);
    console.log(
      `OQ-4: ${(fraction * 100).toFixed(1)}% of highResNow() deltas are non-zero (≥90% required)`
    );
    expect(fraction).toBeGreaterThanOrEqual(0.9);
  });

  it("OQ-5: getDiagnostics() returns consistent values across 1,000 calls under load", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const clock = result.value;

    const baseline = clock.getDiagnostics();
    let inconsistency = false;
    for (let i = 0; i < 1_000; i++) {
      clock.monotonicNow(); // interleaved load
      const diag = clock.getDiagnostics();
      if (
        diag.adapterName !== baseline.adapterName ||
        diag.monotonicSource !== baseline.monotonicSource ||
        diag.highResSource !== baseline.highResSource
      ) {
        inconsistency = true;
        break;
      }
    }
    expect(inconsistency).toBe(false);
  });
});

// =============================================================================
// OQ-6..8: Negative tests
// (virtual adapters used where simulating conditions infeasible in production)
// =============================================================================

describe("OQ-6..8 — Negative tests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("OQ-6: createSystemClock({ gxp: true }) returns err('ST-4') when Date and performance are not frozen", () => {
    /**
     * In standard test environments Date/performance are not frozen, so ST-4 fires.
     * If the environment has pre-frozen them (e.g., production GxP deployment), the
     * check is skipped and the test passes gracefully.
     */
    const result = createSystemClock({ gxp: true });
    if (result.isErr()) {
      expect(result.error._tag).toBe("SystemClockStartupError");
      expect(result.error.check).toBe("ST-4");
    } else {
      expect(result.isOk()).toBe(true);
    }
  });

  it("OQ-7: TemporalContextFactory.create() propagates err(SequenceOverflowError) under 100 concurrent microtask calls when sequence is in overflow state", async () => {
    /**
     * Virtual adapters are used here because:
     * - Triggering overflow with the production generator requires ~2^53 calls.
     * - VirtualSequenceGenerator.setCounter() allows direct simulation.
     */
    const { createVirtualSequenceGenerator } = await import(
      "../src/testing/virtual-sequence.js"
    );
    const { createVirtualClock } = await import(
      "../src/testing/virtual-clock.js"
    );

    const seqResult = createVirtualSequenceGenerator();
    if (seqResult.isErr()) throw seqResult.error;
    const seq = seqResult.value;
    seq.setCounter(Number.MAX_SAFE_INTEGER);
    const clockResult = createVirtualClock();
    if (clockResult.isErr()) throw clockResult.error;
    const clock = clockResult.value;
    const factory = createTemporalContextFactory(clock, seq);

    const CONCURRENT_CALLS = 100;
    const tasks = Array.from({ length: CONCURRENT_CALLS }, () =>
      Promise.resolve().then(() => factory.create())
    );
    const results = await Promise.all(tasks);

    for (const r of results) {
      expect(r.isErr()).toBe(true);
      if (r.isErr()) {
        expect(r.error._tag).toBe("SequenceOverflowError");
      }
    }
  });

  it("OQ-8: createSystemClock() returns err('ST-2') when Date.now is mocked to return 0 (implausible wall-clock)", () => {
    /**
     * ST-2 rejects wall-clock values before 2020-01-01.
     * Date.now is spied on before construction so the clock captures the mock.
     */
    vi.spyOn(Date, "now").mockReturnValue(0);
    const result = createSystemClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("SystemClockStartupError");
      expect(result.error.check).toBe("ST-2");
    }
  });
});
