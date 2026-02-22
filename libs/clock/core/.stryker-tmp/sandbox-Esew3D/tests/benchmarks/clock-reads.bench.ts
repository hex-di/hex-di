/**
 * Benchmark: Clock read throughput
 *
 * Measures the raw throughput of monotonicNow(), wallClockNow(), and highResNow()
 * on the system clock adapter.
 */
// @ts-nocheck


import { bench, describe } from "vitest";
import { createSystemClock } from "../../src/adapters/system-clock.js";

describe("clock reads", () => {
  const result = createSystemClock();
  if (!result.isOk()) throw new Error("Clock startup failed");
  const clock = result.value;

  bench("monotonicNow", () => {
    clock.monotonicNow();
  });

  bench("wallClockNow", () => {
    clock.wallClockNow();
  });

  bench("highResNow", () => {
    clock.highResNow();
  });
});
