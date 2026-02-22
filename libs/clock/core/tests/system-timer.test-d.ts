/**
 * System timer scheduler type-level tests — DoD 18
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  TimerHandle,
  TimerSchedulerService,
  TimerValidationError,
} from "../src/ports/timer-scheduler.js";
import { SystemTimerSchedulerAdapter } from "../src/index.js";
import { createSystemTimerScheduler } from "../src/adapters/system-timer.js";
import type { AdapterConstraint, InferAdapterProvides, InferService } from "@hex-di/core";
import type { Result, ResultAsync } from "@hex-di/result";

describe("TimerHandle type shape", () => {
  it("TimerHandle has readonly _tag 'TimerHandle'", () => {
    expectTypeOf<TimerHandle["_tag"]>().toEqualTypeOf<"TimerHandle">();
  });

  it("TimerHandle has readonly id (number)", () => {
    expectTypeOf<TimerHandle["id"]>().toEqualTypeOf<number>();
  });
});

describe("TimerSchedulerService type shape", () => {
  it("TimerSchedulerService has setTimeout method returning Result<TimerHandle, TimerValidationError>", () => {
    expectTypeOf<TimerSchedulerService["setTimeout"]>().returns.toEqualTypeOf<
      Result<TimerHandle, TimerValidationError>
    >();
  });

  it("TimerSchedulerService has setInterval method returning Result<TimerHandle, TimerValidationError>", () => {
    expectTypeOf<TimerSchedulerService["setInterval"]>().returns.toEqualTypeOf<
      Result<TimerHandle, TimerValidationError>
    >();
  });

  it("TimerSchedulerService has clearTimeout method returning void", () => {
    expectTypeOf<TimerSchedulerService["clearTimeout"]>().returns.toEqualTypeOf<void>();
  });

  it("TimerSchedulerService has clearInterval method returning void", () => {
    expectTypeOf<TimerSchedulerService["clearInterval"]>().returns.toEqualTypeOf<void>();
  });

  it("TimerSchedulerService sleep() returns ResultAsync<void, TimerValidationError>", () => {
    expectTypeOf<TimerSchedulerService["sleep"]>().returns.toEqualTypeOf<
      ResultAsync<void, TimerValidationError>
    >();
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
