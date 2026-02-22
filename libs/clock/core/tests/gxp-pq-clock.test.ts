/**
 * GxP Performance Qualification (PQ) — @hex-di/clock
 *
 * PQ-1 through PQ-5: Performance and reliability contracts over sustained operation.
 *
 * Duration and thresholds are configurable via environment variables so that the
 * same test suite serves both CI smoke gates and full GxP deployment qualification:
 *
 *   PQ_DURATION_MS              (default: 3000)    — set to 60000 for deployment
 *   PQ_MEMORY_GROWTH_THRESHOLD  (default: 20971520) — bytes; 20 MB default (CI)
 *   PQ_SAMPLE_INTERVAL_MS       (default: 500)      — heap sampling interval
 *
 * ZERO imports from src/testing/. All tests use production adapters only.
 */

import { describe, it, expect } from "vitest";
import {
  createSystemClock,
  createSystemSequenceGenerator,
  createTemporalContextFactory,
} from "../src/index.js";

// =============================================================================
// PQ configuration
// =============================================================================

const PQ_DURATION_MS = Number(process.env["PQ_DURATION_MS"] ?? "3000");
const PQ_MEMORY_GROWTH_THRESHOLD = Number(
  process.env["PQ_MEMORY_GROWTH_THRESHOLD"] ?? String(20 * 1024 * 1024)
);
const PQ_SAMPLE_INTERVAL_MS = Number(
  process.env["PQ_SAMPLE_INTERVAL_MS"] ?? "500"
);

// Conservative floor for CI environments.
// Full GxP deployment qualification runs with PQ_DURATION_MS=60000 and
// verifies against the DoD-30 benchmark floors (10× higher).
const THROUGHPUT_OPS_FLOOR = 1_000_000;

// =============================================================================
// PQ-1: Throughput meets requirements over sustained window
// =============================================================================

describe("PQ-1: Throughput meets requirements over sustained window (PQ_DURATION_MS)", () => {
  it(
    "monotonicNow(), wallClockNow(), highResNow() sustain required throughput",
    { timeout: PQ_DURATION_MS + 30_000 },
    () => {
      const result = createSystemClock();
      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;
      const clock = result.value;

      const deadline = performance.now() + PQ_DURATION_MS;
      let iterations = 0;
      while (performance.now() < deadline) {
        clock.monotonicNow();
        clock.wallClockNow();
        clock.highResNow();
        iterations++;
      }

      const opsPerSec = (iterations * 3 * 1_000) / PQ_DURATION_MS;
      console.log(
        `PQ-1: ${iterations.toLocaleString()} iterations in ${PQ_DURATION_MS}ms` +
          ` → ${Math.round(opsPerSec).toLocaleString()} clock-ops/sec`
      );
      expect(opsPerSec).toBeGreaterThan(THROUGHPUT_OPS_FLOOR);
    }
  );
});

// =============================================================================
// PQ-2: highResNow() sub-millisecond precision on deployment platform
// =============================================================================

describe("PQ-2: highResNow() sub-millisecond precision on deployment platform", () => {
  it("≥90% of highResNow() consecutive deltas are non-zero (sub-millisecond precision)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const clock = result.value;

    const SAMPLES = 10_000;
    // Enforce a 0.01 ms (10 µs) gap between samples so the clock has time to
    // advance between consecutive readings.  Total window ≈ 100 ms.
    const GAP_MS = 0.01;
    let prev = clock.highResNow();
    let nonZeroDeltas = 0;
    let lastCallAt = performance.now();
    for (let i = 1; i < SAMPLES; i++) {
      while (performance.now() - lastCallAt < GAP_MS) { /* busy-wait */ }
      lastCallAt = performance.now();
      const curr = clock.highResNow();
      if (curr !== prev) nonZeroDeltas++;
      prev = curr;
    }

    const fraction = nonZeroDeltas / (SAMPLES - 1);
    console.log(
      `PQ-2: ${(fraction * 100).toFixed(1)}% of highResNow() deltas are non-zero (≥90% required)`
    );
    expect(fraction).toBeGreaterThanOrEqual(0.9);
  });
});

// =============================================================================
// PQ-3: Sequence uniqueness over extended period (configurable via PQ_DURATION_MS)
// =============================================================================

describe("PQ-3: Sequence uniqueness over extended period (PQ_DURATION_MS)", () => {
  it(
    "all next() values are strictly increasing over the full PQ_DURATION_MS window",
    { timeout: PQ_DURATION_MS + 30_000 },
    () => {
      const seq = createSystemSequenceGenerator();
      const deadline = performance.now() + PQ_DURATION_MS;

      let prev = 0;
      let count = 0;
      let violation = false;
      while (performance.now() < deadline) {
        const r = seq.next();
        if (r.isErr()) break; // overflow boundary — acceptable stop condition
        if (r.value <= prev) {
          violation = true;
          break;
        }
        prev = r.value;
        count++;
      }

      console.log(
        `PQ-3: ${count.toLocaleString()} unique sequence values generated in ${PQ_DURATION_MS}ms`
      );
      expect(violation).toBe(false);
    }
  );
});

// =============================================================================
// PQ-4: No memory leak over sustained operation
// =============================================================================

describe("PQ-4: No memory leak over sustained operation", () => {
  it(
    "heap growth stays below PQ_MEMORY_GROWTH_THRESHOLD over PQ_DURATION_MS",
    { timeout: PQ_DURATION_MS + 30_000 },
    () => {
      if (
        typeof process === "undefined" ||
        typeof process.memoryUsage !== "function"
      ) {
        console.log("PQ-4: process.memoryUsage() not available — skipping");
        return;
      }

      const result = createSystemClock();
      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;
      const clock = result.value;
      const seq = createSystemSequenceGenerator();
      const factory = createTemporalContextFactory(clock, seq);

      // Force GC if available (requires --expose-gc flag)
      if (typeof globalThis.gc === "function") globalThis.gc();

      const baselineHeap = process.memoryUsage().heapUsed;
      let maxHeap = baselineHeap;
      const deadline = performance.now() + PQ_DURATION_MS;

      while (performance.now() < deadline) {
        // Run work for one sample interval, then take a heap sample
        const nextSample = Math.min(
          performance.now() + PQ_SAMPLE_INTERVAL_MS,
          deadline
        );
        while (performance.now() < nextSample) {
          factory.create();
        }
        const sample = process.memoryUsage().heapUsed;
        if (sample > maxHeap) maxHeap = sample;
      }

      const growth = maxHeap - baselineHeap;
      console.log(
        `PQ-4: Max heap growth: ${(growth / 1024).toFixed(1)} KB over ${PQ_DURATION_MS}ms` +
          ` (threshold: ${(PQ_MEMORY_GROWTH_THRESHOLD / 1024).toFixed(0)} KB)`
      );
      expect(growth).toBeLessThan(PQ_MEMORY_GROWTH_THRESHOLD);
    }
  );
});

// =============================================================================
// PQ-5: Disaster recovery — simulated process restart
// =============================================================================

describe("PQ-5: Disaster recovery — simulated process restart", () => {
  it("after simulated restart, new adapter passes startup self-test and produces valid timestamps without state carryover", () => {
    // --- First "process run" ---
    const first = createSystemClock();
    expect(first.isOk()).toBe(true);
    if (!first.isOk()) return;
    const firstSeq = createSystemSequenceGenerator();

    // Use the adapters to simulate active operation
    first.value.monotonicNow();
    first.value.wallClockNow();
    const r1 = firstSeq.next();
    expect(r1.isOk()).toBe(true);
    if (!r1.isOk()) return;
    const lastSeqBeforeRestart = firstSeq.current();

    // --- Simulated restart: first instances go out of scope ---

    // --- Second "process run" — entirely fresh instances, no shared state ---
    const second = createSystemClock();
    expect(second.isOk()).toBe(true); // startup self-test must pass on restart
    if (!second.isOk()) return;
    const secondSeq = createSystemSequenceGenerator();

    // New adapter produces valid timestamps
    expect(second.value.monotonicNow()).toBeGreaterThanOrEqual(0);
    expect(second.value.wallClockNow()).toBeGreaterThan(1_577_836_800_000); // after 2020

    // Sequence starts fresh — no carryover from the first instance
    const r2 = secondSeq.next();
    expect(r2.isOk()).toBe(true);
    if (!r2.isOk()) return;
    expect(r2.value).toBe(1); // always starts at 1 after restart

    // getDiagnostics() is functional on the new instance
    const diag = second.value.getDiagnostics();
    expect(diag.adapterName).toBe("SystemClockAdapter");

    console.log(
      `PQ-5: First run last seq=${lastSeqBeforeRestart}, ` +
        `second run first seq=${r2.value} (no state carryover confirmed)`
    );
  });
});
