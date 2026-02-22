/**
 * Benchmark: Abstraction overhead
 *
 * Compares direct platform API calls vs hex-di clock adapter to measure
 * the overhead introduced by the port/adapter abstraction.
 */
// @ts-nocheck


import { bench, describe } from "vitest";
import { createSystemClock } from "../../src/adapters/system-clock.js";

describe("abstraction overhead", () => {
  const clockResult = createSystemClock();
  if (!clockResult.isOk()) throw new Error("Clock startup failed");
  const clock = clockResult.value;

  bench("Date.now() — baseline", () => {
    Date.now();
  });

  bench("performance.now() — baseline", () => {
    performance.now();
  });

  bench("wallClockNow() — via adapter", () => {
    clock.wallClockNow();
  });

  bench("monotonicNow() — via adapter", () => {
    clock.monotonicNow();
  });
});
