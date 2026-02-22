/**
 * SystemTimerSchedulerAdapter — production timer scheduler using platform-native APIs.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Result, ResultAsync } from "@hex-di/result";
import { ok, err, ResultAsync as RA } from "@hex-di/result";
import {
  TimerSchedulerPort,
  createTimerHandle,
  createTimerValidationError,
} from "../ports/timer-scheduler.js";
import type { TimerSchedulerService, TimerHandle, TimerValidationError } from "../ports/timer-scheduler.js";

/**
 * Creates a system timer scheduler using platform-native timer APIs.
 * Captures platform API references at construction time (SEC-2 anti-tampering).
 */
export function createSystemTimerScheduler(): TimerSchedulerService {
  // SEC-2: Capture platform timer API references at construction time.
  const capturedSetTimeout = globalThis.setTimeout.bind(globalThis);
  const capturedSetInterval = globalThis.setInterval.bind(globalThis);
  const capturedClearTimeout = globalThis.clearTimeout.bind(globalThis);
  const capturedClearInterval = globalThis.clearInterval.bind(globalThis);

  let nextId = 1;
  const handleMap = new Map<number, ReturnType<typeof capturedSetTimeout>>();

  const createHandle = (platformId: ReturnType<typeof capturedSetTimeout>): TimerHandle => {
    const id = nextId;
    nextId += 1;
    handleMap.set(id, platformId);
    return createTimerHandle(id);
  };

  return Object.freeze({
    setTimeout(callback: () => void, ms: number): Result<TimerHandle, TimerValidationError> {
      if (typeof callback !== "function") {
        return err(createTimerValidationError("callback", "callback must be a function"));
      }
      if (!Number.isFinite(ms) || ms < 0) {
        return err(createTimerValidationError("ms", `ms must be a non-negative finite number, got ${ms}`));
      }
      // Pre-allocate the handle ID so the closure can reference it without
      // a forward-reference let binding.
      const handleId = nextId;
      const platformId = capturedSetTimeout(() => {
        handleMap.delete(handleId);
        callback();
      }, ms);
      nextId += 1;
      handleMap.set(handleId, platformId);
      return ok(createTimerHandle(handleId));
    },

    setInterval(callback: () => void, ms: number): Result<TimerHandle, TimerValidationError> {
      if (typeof callback !== "function") {
        return err(createTimerValidationError("callback", "callback must be a function"));
      }
      if (!Number.isFinite(ms) || ms <= 0) {
        return err(createTimerValidationError("ms", `ms must be a positive finite number, got ${ms}`));
      }
      const platformId = capturedSetInterval(callback, ms);
      return ok(createHandle(platformId));
    },

    clearTimeout(handle: TimerHandle): void {
      const platformId = handleMap.get(handle.id);
      // Stryker disable next-line ConditionalExpression -- EQUIVALENT: clearTimeout(undefined) is a no-op in Node.js; the guard only prevents a Map lookup miss from calling clearTimeout unnecessarily
      if (platformId !== undefined) {
        capturedClearTimeout(platformId);
        handleMap.delete(handle.id);
      }
    },

    clearInterval(handle: TimerHandle): void {
      const platformId = handleMap.get(handle.id);
      // Stryker disable next-line ConditionalExpression -- EQUIVALENT: clearInterval(undefined) is a no-op in Node.js; the guard only prevents a Map lookup miss from calling clearInterval unnecessarily
      if (platformId !== undefined) {
        capturedClearInterval(platformId);
        handleMap.delete(handle.id);
      }
    },

    sleep(ms: number): ResultAsync<void, TimerValidationError> {
      if (!Number.isFinite(ms) || ms < 0) {
        return RA.err(createTimerValidationError("ms", `ms must be a non-negative finite number, got ${ms}`));
      }
      return RA.fromSafePromise(
        new Promise<void>((resolve) => {
          capturedSetTimeout(resolve, ms);
        })
      );
    },
  });
}

/** Pre-wired singleton adapter that provides TimerSchedulerPort. */
export const SystemTimerSchedulerAdapter = createAdapter({
  provides: TimerSchedulerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createSystemTimerScheduler(),
});
