/**
 * TimerSchedulerPort — injectable timer scheduling for deterministic testing.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Result, ResultAsync } from "@hex-di/result";

/** Opaque handle returned by setTimeout and setInterval. Frozen at creation. */
export interface TimerHandle {
  readonly _tag: "TimerHandle";
  readonly id: number;
}

/** Factory for TimerHandle — frozen per adapter immutability requirements. */
export function createTimerHandle(id: number): TimerHandle {
  return Object.freeze({ _tag: "TimerHandle" as const, id });
}

/** Error returned when a timer parameter fails validation. */
export interface TimerValidationError {
  readonly _tag: "TimerValidationError";
  readonly parameter: string;
  readonly message: string;
}

/** Factory for TimerValidationError — frozen per GxP error immutability. */
export function createTimerValidationError(
  parameter: string,
  message: string
): TimerValidationError {
  return Object.freeze({
    _tag: "TimerValidationError" as const,
    parameter,
    message,
  });
}

/** Service interface for TimerSchedulerPort. */
export interface TimerSchedulerService {
  readonly setTimeout: (callback: () => void, ms: number) => Result<TimerHandle, TimerValidationError>;
  readonly setInterval: (callback: () => void, ms: number) => Result<TimerHandle, TimerValidationError>;
  readonly clearTimeout: (handle: TimerHandle) => void;
  readonly clearInterval: (handle: TimerHandle) => void;
  readonly sleep: (ms: number) => ResultAsync<void, TimerValidationError>;
}

/** Injectable timer scheduler port for deterministic async testing. */
export const TimerSchedulerPort = port<TimerSchedulerService>()({
  name: "TimerScheduler",
  direction: "outbound",
  description: "Injectable timer scheduling for deterministic async testing",
  category: "clock/timer",
  tags: ["timer", "scheduler", "async", "testing"],
});
