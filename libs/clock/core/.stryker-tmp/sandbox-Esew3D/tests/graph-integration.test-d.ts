/**
 * Graph integration type-level tests — DoD 10/12
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import type { AdapterConstraint, InferAdapterProvides, InferService } from "@hex-di/core";
import {
  SystemClockAdapter,
  SystemSequenceGeneratorAdapter,
  SystemTimerSchedulerAdapter,
} from "../src/index.js";
import type { ClockService } from "../src/ports/clock.js";
import type { SequenceGeneratorService } from "../src/ports/sequence.js";
import type { TimerSchedulerService } from "../src/ports/timer-scheduler.js";

describe("Adapter type-level checks", () => {
  it("SystemClockAdapter satisfies AdapterConstraint", () => {
    expectTypeOf(SystemClockAdapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("SystemSequenceGeneratorAdapter satisfies AdapterConstraint", () => {
    expectTypeOf(SystemSequenceGeneratorAdapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("SystemTimerSchedulerAdapter satisfies AdapterConstraint", () => {
    expectTypeOf(SystemTimerSchedulerAdapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("SystemClockAdapter provides ClockService (InferService<InferAdapterProvides>)", () => {
    type Provides = InferService<InferAdapterProvides<typeof SystemClockAdapter>>;
    expectTypeOf<Provides>().toMatchTypeOf<ClockService>();
  });

  it("SystemSequenceGeneratorAdapter provides SequenceGeneratorService (InferService<InferAdapterProvides>)", () => {
    type Provides = InferService<InferAdapterProvides<typeof SystemSequenceGeneratorAdapter>>;
    expectTypeOf<Provides>().toMatchTypeOf<SequenceGeneratorService>();
  });

  it("SystemTimerSchedulerAdapter provides TimerSchedulerService (InferService<InferAdapterProvides>)", () => {
    type Provides = InferService<InferAdapterProvides<typeof SystemTimerSchedulerAdapter>>;
    expectTypeOf<Provides>().toMatchTypeOf<TimerSchedulerService>();
  });
});
