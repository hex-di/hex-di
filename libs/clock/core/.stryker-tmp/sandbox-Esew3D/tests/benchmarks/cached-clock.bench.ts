/**
 * Benchmark: Cached clock read throughput
 *
 * Measures the throughput of CachedClockAdapter's recentMonotonicNow() and
 * recentWallClockNow() methods, which should be cheaper than direct clock reads
 * since they return a cached snapshot rather than calling platform APIs.
 */
// @ts-nocheck


import { bench, describe } from "vitest";
import { createSystemClock } from "../../src/adapters/system-clock.js";
import { createCachedClock } from "../../src/adapters/cached-clock.js";

describe("cached clock reads", () => {
  const clockResult = createSystemClock();
  if (!clockResult.isOk()) throw new Error("Clock startup failed");
  const clock = clockResult.value;

  const cachedClock = createCachedClock({ source: clock, updateIntervalMs: 1 });
  cachedClock.start();

  bench("recentMonotonicNow()", () => {
    cachedClock.recentMonotonicNow();
  });

  bench("recentWallClockNow()", () => {
    cachedClock.recentWallClockNow();
  });
});
