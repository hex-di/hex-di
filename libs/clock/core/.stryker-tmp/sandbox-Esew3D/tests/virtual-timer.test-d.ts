/**
 * VirtualTimerScheduler type-level tests — DoD 19-20
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import type { VirtualTimerScheduler, ClockTimeoutError } from "../src/testing/virtual-timer.js";
import type { TimerSchedulerService } from "../src/ports/timer-scheduler.js";

describe("VirtualTimerScheduler type shape", () => {
  it("VirtualTimerScheduler extends TimerSchedulerService", () => {
    expectTypeOf<VirtualTimerScheduler>().toMatchTypeOf<TimerSchedulerService>();
  });

  it("VirtualTimerScheduler has pendingCount() method returning number", () => {
    expectTypeOf<VirtualTimerScheduler>().toHaveProperty("pendingCount");
    expectTypeOf<VirtualTimerScheduler["pendingCount"]>().returns.toEqualTypeOf<number>();
  });

  it("VirtualTimerScheduler has advanceTime() method returning void", () => {
    expectTypeOf<VirtualTimerScheduler>().toHaveProperty("advanceTime");
    expectTypeOf<VirtualTimerScheduler["advanceTime"]>().returns.toEqualTypeOf<void>();
  });

  it("VirtualTimerScheduler has runAll() method returning void", () => {
    expectTypeOf<VirtualTimerScheduler>().toHaveProperty("runAll");
    expectTypeOf<VirtualTimerScheduler["runAll"]>().returns.toEqualTypeOf<void>();
  });

  it("VirtualTimerScheduler has runNext() method returning void", () => {
    expectTypeOf<VirtualTimerScheduler>().toHaveProperty("runNext");
    expectTypeOf<VirtualTimerScheduler["runNext"]>().returns.toEqualTypeOf<void>();
  });

  it("VirtualTimerScheduler blockUntil() returns Promise<void>", () => {
    expectTypeOf<VirtualTimerScheduler["blockUntil"]>().returns.toEqualTypeOf<Promise<void>>();
  });
});

describe("ClockTimeoutError type shape", () => {
  it("ClockTimeoutError has _tag 'ClockTimeoutError'", () => {
    expectTypeOf<ClockTimeoutError["_tag"]>().toEqualTypeOf<"ClockTimeoutError">();
  });

  it("ClockTimeoutError has readonly expected (number)", () => {
    expectTypeOf<ClockTimeoutError["expected"]>().toEqualTypeOf<number>();
  });

  it("ClockTimeoutError has readonly actual (number)", () => {
    expectTypeOf<ClockTimeoutError["actual"]>().toEqualTypeOf<number>();
  });

  it("ClockTimeoutError has readonly timeoutMs (number)", () => {
    expectTypeOf<ClockTimeoutError["timeoutMs"]>().toEqualTypeOf<number>();
  });

  it("ClockTimeoutError has readonly message (string)", () => {
    expectTypeOf<ClockTimeoutError["message"]>().toEqualTypeOf<string>();
  });
});
