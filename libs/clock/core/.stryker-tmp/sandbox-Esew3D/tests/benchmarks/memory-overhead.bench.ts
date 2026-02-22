/**
 * Benchmark: Memory overhead of TemporalContext creation
 *
 * Measures allocation rate when creating TemporalContext objects in a tight loop.
 * Used to assess GC pressure from high-throughput usage.
 */
// @ts-nocheck


import { bench, describe } from "vitest";
import { createSystemClock, createSystemSequenceGenerator } from "../../src/adapters/system-clock.js";
import { createTemporalContextFactory } from "../../src/temporal-context.js";

describe("memory overhead", () => {
  const clockResult = createSystemClock();
  if (!clockResult.isOk()) throw new Error("Clock startup failed");
  const clock = clockResult.value;
  const seq = createSystemSequenceGenerator();
  const factory = createTemporalContextFactory(clock, seq);

  bench("create() — allocation rate", () => {
    // Each create() allocates a frozen TemporalContext object
    factory.create();
  });

  bench("create() + access fields — access pattern", () => {
    const result = factory.create();
    if (result.isOk()) {
      // Touch all fields to prevent dead-code elimination
      const _ = result.value.sequenceNumber + result.value.monotonicTimestamp + result.value.wallClockTimestamp;
      void _;
    }
  });
});
