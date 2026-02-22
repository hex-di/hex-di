/**
 * GxP Performance Qualification (PQ) — @hex-di/clock
 *
 * PQ-1 through PQ-5: Performance contracts using production adapters only.
 * ZERO imports from src/testing/.
 *
 * Each PQ test reports its measured throughput and uses a 10% floor threshold
 * to avoid CI flakiness while catching catastrophic regressions.
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import {
  createSystemClock,
  createSystemSequenceGenerator,
  createTemporalContextFactory,
} from "../src/index.js";

// =============================================================================
// PQ thresholds — 10% of the target floor to prevent CI flakiness
// while catching catastrophic regressions
// =============================================================================

const MONOTONIC_OPS_FLOOR = 1_000_000;
const WALLCLOCK_OPS_FLOOR = 1_000_000;
const HIGHRES_OPS_FLOOR = 1_000_000;
const SEQUENCE_OPS_FLOOR = 1_000_000;
const TEMPORAL_CONTEXT_OPS_FLOOR = 500_000;

const CI_SAFETY_FACTOR = 0.1; // 10% of floor

// =============================================================================
// PQ-1: monotonicNow() throughput
// =============================================================================

describe("PQ-1: monotonicNow() sustains > 1,000,000 ops/second", () => {
  it("monotonicNow() throughput meets floor", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const clock = result.value;
    const SAMPLES = 1_000_000;

    const start = performance.now();
    for (let i = 0; i < SAMPLES; i++) {
      clock.monotonicNow();
    }
    const end = performance.now();

    const durationSec = (end - start) / 1000;
    const opsPerSec = SAMPLES / durationSec;

    console.log(`PQ-1: monotonicNow() throughput: ${Math.round(opsPerSec).toLocaleString()} ops/sec`);

    const threshold = MONOTONIC_OPS_FLOOR * CI_SAFETY_FACTOR;
    expect(opsPerSec).toBeGreaterThan(threshold);
  });
});

// =============================================================================
// PQ-2: wallClockNow() throughput
// =============================================================================

describe("PQ-2: wallClockNow() sustains > 1,000,000 ops/second", () => {
  it("wallClockNow() throughput meets floor", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const clock = result.value;
    const SAMPLES = 1_000_000;

    const start = performance.now();
    for (let i = 0; i < SAMPLES; i++) {
      clock.wallClockNow();
    }
    const end = performance.now();

    const durationSec = (end - start) / 1000;
    const opsPerSec = SAMPLES / durationSec;

    console.log(`PQ-2: wallClockNow() throughput: ${Math.round(opsPerSec).toLocaleString()} ops/sec`);

    const threshold = WALLCLOCK_OPS_FLOOR * CI_SAFETY_FACTOR;
    expect(opsPerSec).toBeGreaterThan(threshold);
  });
});

// =============================================================================
// PQ-3: highResNow() throughput
// =============================================================================

describe("PQ-3: highResNow() sustains > 1,000,000 ops/second", () => {
  it("highResNow() throughput meets floor", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const clock = result.value;
    const SAMPLES = 1_000_000;

    const start = performance.now();
    for (let i = 0; i < SAMPLES; i++) {
      clock.highResNow();
    }
    const end = performance.now();

    const durationSec = (end - start) / 1000;
    const opsPerSec = SAMPLES / durationSec;

    console.log(`PQ-3: highResNow() throughput: ${Math.round(opsPerSec).toLocaleString()} ops/sec`);

    const threshold = HIGHRES_OPS_FLOOR * CI_SAFETY_FACTOR;
    expect(opsPerSec).toBeGreaterThan(threshold);
  });
});

// =============================================================================
// PQ-4: SequenceGenerator next() throughput
// =============================================================================

describe("PQ-4: SequenceGenerator next() sustains > 1,000,000 ops/second", () => {
  it("next() throughput meets floor", () => {
    const seq = createSystemSequenceGenerator();
    const SAMPLES = 1_000_000;

    const start = performance.now();
    for (let i = 0; i < SAMPLES; i++) {
      seq.next();
    }
    const end = performance.now();

    const durationSec = (end - start) / 1000;
    const opsPerSec = SAMPLES / durationSec;

    console.log(`PQ-4: seq.next() throughput: ${Math.round(opsPerSec).toLocaleString()} ops/sec`);

    const threshold = SEQUENCE_OPS_FLOOR * CI_SAFETY_FACTOR;
    expect(opsPerSec).toBeGreaterThan(threshold);
  });
});

// =============================================================================
// PQ-5: TemporalContextFactory.create() throughput
// =============================================================================

describe("PQ-5: TemporalContextFactory.create() sustains > 500,000 ops/second", () => {
  it("create() throughput meets floor", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const seq = createSystemSequenceGenerator();
    const factory = createTemporalContextFactory(clockResult.value, seq);
    const SAMPLES = 500_000;

    const start = performance.now();
    for (let i = 0; i < SAMPLES; i++) {
      factory.create();
    }
    const end = performance.now();

    const durationSec = (end - start) / 1000;
    const opsPerSec = SAMPLES / durationSec;

    console.log(`PQ-5: TemporalContextFactory.create() throughput: ${Math.round(opsPerSec).toLocaleString()} ops/sec`);

    const threshold = TEMPORAL_CONTEXT_OPS_FLOOR * CI_SAFETY_FACTOR;
    expect(opsPerSec).toBeGreaterThan(threshold);
  });
});
