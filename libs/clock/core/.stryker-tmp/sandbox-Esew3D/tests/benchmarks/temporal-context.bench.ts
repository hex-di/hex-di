/**
 * Benchmark: TemporalContext creation throughput
 *
 * Measures the throughput of TemporalContextFactory.create() which performs
 * a sequence.next() + monotonicNow() + wallClockNow() capture in order.
 */
// @ts-nocheck


import { bench, describe } from "vitest";
import { createSystemClock, createSystemSequenceGenerator } from "../../src/adapters/system-clock.js";
import { createTemporalContextFactory } from "../../src/temporal-context.js";

describe("temporal context", () => {
  const clockResult = createSystemClock();
  if (!clockResult.isOk()) throw new Error("Clock startup failed");
  const clock = clockResult.value;
  const seq = createSystemSequenceGenerator();
  const factory = createTemporalContextFactory(clock, seq);

  bench("create()", () => {
    factory.create();
  });

  bench("createOverflowContext()", () => {
    factory.createOverflowContext();
  });
});
