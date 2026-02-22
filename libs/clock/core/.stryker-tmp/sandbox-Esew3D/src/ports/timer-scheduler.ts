/**
 * TimerSchedulerPort — injectable timer scheduling for deterministic testing.
 *
 * @packageDocumentation
 */
// @ts-nocheck


import { port } from "@hex-di/core";

/** Opaque handle returned by setTimeout and setInterval. Frozen at creation. */
export interface TimerHandle {
  readonly _tag: "TimerHandle";
  readonly id: number;
}

/** Factory for TimerHandle — frozen per adapter immutability requirements. */
export function createTimerHandle(id: number): TimerHandle {
  return Object.freeze({ _tag: "TimerHandle" as const, id });
}

/** Service interface for TimerSchedulerPort. */
export interface TimerSchedulerService {
  readonly setTimeout: (callback: () => void, ms: number) => TimerHandle;
  readonly setInterval: (callback: () => void, ms: number) => TimerHandle;
  readonly clearTimeout: (handle: TimerHandle) => void;
  readonly clearInterval: (handle: TimerHandle) => void;
  readonly sleep: (ms: number) => Promise<void>;
}

/** Injectable timer scheduler port for deterministic async testing. */
export const TimerSchedulerPort = port<TimerSchedulerService>()({
  name: "TimerScheduler",
  direction: "outbound",
  description: "Injectable timer scheduling for deterministic async testing",
  category: "clock/timer",
  tags: ["timer", "scheduler", "async", "testing"],
});
