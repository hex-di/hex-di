/**
 * System timer scheduler type-level tests — DoD 18
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import type { TimerHandle, TimerSchedulerService } from "../src/ports/timer-scheduler.js";
import { SystemTimerSchedulerAdapter } from "../src/index.js";
import { createSystemTimerScheduler } from "../src/adapters/system-timer.js";
import type { AdapterConstraint, InferAdapterProvides, InferService } from "@hex-di/core";

describe("TimerHandle type shape", () => {
  it("TimerHandle has readonly _tag 'TimerHandle'", () => {
    expectTypeOf<TimerHandle["_tag"]>().toEqualTypeOf<"TimerHandle">();
  });

  it("TimerHandle has readonly id (number)", () => {
    expectTypeOf<TimerHandle["id"]>().toEqualTypeOf<number>();
  });
});

describe("TimerSchedulerService type shape", () => {
  it("TimerSchedulerService has setTimeout method returning TimerHandle", () => {
    expectTypeOf<TimerSchedulerService["setTimeout"]>().returns.toEqualTypeOf<TimerHandle>();
  });

  it("TimerSchedulerService has setInterval method returning TimerHandle", () => {
    expectTypeOf<TimerSchedulerService["setInterval"]>().returns.toEqualTypeOf<TimerHandle>();
  });

  it("TimerSchedulerService has clearTimeout method returning void", () => {
    expectTypeOf<TimerSchedulerService["clearTimeout"]>().returns.toEqualTypeOf<void>();
  });

  it("TimerSchedulerService has clearInterval method returning void", () => {
    expectTypeOf<TimerSchedulerService["clearInterval"]>().returns.toEqualTypeOf<void>();
  });

  it("TimerSchedulerService sleep() returns Promise<void>", () => {
    expectTypeOf<TimerSchedulerService["sleep"]>().returns.toEqualTypeOf<Promise<void>>();
  });
});

describe("createSystemTimerScheduler return type", () => {
  it("createSystemTimerScheduler() returns TimerSchedulerService", () => {
    expectTypeOf(createSystemTimerScheduler()).toMatchTypeOf<TimerSchedulerService>();
  });
});

describe("SystemTimerSchedulerAdapter type", () => {
  it("SystemTimerSchedulerAdapter satisfies AdapterConstraint", () => {
    expectTypeOf(SystemTimerSchedulerAdapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("SystemTimerSchedulerAdapter provides TimerSchedulerService (InferService<InferAdapterProvides>)", () => {
    type Provides = InferService<InferAdapterProvides<typeof SystemTimerSchedulerAdapter>>;
    expectTypeOf<Provides>().toMatchTypeOf<TimerSchedulerService>();
  });
});
