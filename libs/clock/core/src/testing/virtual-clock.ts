/**
 * VirtualClockAdapter — controllable test clock for deterministic time testing.
 *
 * NOT frozen — mutable state required for control methods.
 * Exported only from @hex-di/clock/testing, never from the main entry point.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { asMonotonic, asWallClock, asHighRes } from "../branded.js";
import { ClockPort } from "../ports/clock.js";
import type { ClockService } from "../ports/clock.js";
import { createClockRangeError } from "../clock-range-error.js";
import type { ClockRangeError } from "../clock-range-error.js";

export type { ClockRangeError };

/** Mutable time values for the virtual clock. */
export interface VirtualClockValues {
  readonly monotonic: number;
  readonly wallClock: number;
  readonly highRes: number;
}

/** Options for createVirtualClock. */
export interface VirtualClockOptions {
  readonly initialMonotonic?: number;
  readonly initialWallClock?: number;
  readonly initialHighRes?: number;
  readonly autoAdvance?: number;
}

/**
 * Extended interface for the virtual clock adapter.
 * Includes control methods for test manipulation.
 */
export interface VirtualClockAdapterInterface extends ClockService {
  readonly advance: (ms: number) => Result<void, ClockRangeError>;
  readonly set: (values: Partial<VirtualClockValues>) => Result<void, ClockRangeError>;
  readonly jumpWallClock: (ms: number) => Result<void, ClockRangeError>;
  readonly setAutoAdvance: (ms: number) => Result<void, ClockRangeError>;
  readonly getAutoAdvance: () => number;
  /** Internal: register an advance listener (used by VirtualTimerScheduler). */
  readonly _onAdvance?: (callback: (ms: number) => void) => void;
}

const DEFAULT_WALL_CLOCK = 1707753600000; // 2024-02-12T12:00:00Z

/**
 * Creates a virtual clock adapter with fully controllable time.
 *
 * Returns err(ClockRangeError) when options contain non-finite values.
 * NOT frozen — mutable internal state required for advance(), set(), etc.
 */
export function createVirtualClock(
  options?: VirtualClockOptions
): Result<VirtualClockAdapterInterface, ClockRangeError> {
  const initialMonotonic = options?.initialMonotonic ?? 0;
  const initialWallClock = options?.initialWallClock ?? DEFAULT_WALL_CLOCK;
  const initialHighRes = options?.initialHighRes ?? initialWallClock;
  const initialAutoAdvance = options?.autoAdvance ?? 0;

  // Validate options — reject non-finite values only
  if (options?.initialMonotonic !== undefined && !Number.isFinite(options.initialMonotonic)) {
    return err(
      createClockRangeError(
        "initialMonotonic",
        options.initialMonotonic,
        `VirtualClock option 'initialMonotonic' must be a finite number, got ${options.initialMonotonic}`
      )
    );
  }
  if (options?.initialWallClock !== undefined && !Number.isFinite(options.initialWallClock)) {
    return err(
      createClockRangeError(
        "initialWallClock",
        options.initialWallClock,
        `VirtualClock option 'initialWallClock' must be a finite number, got ${options.initialWallClock}`
      )
    );
  }
  if (options?.initialHighRes !== undefined && !Number.isFinite(options.initialHighRes)) {
    return err(
      createClockRangeError(
        "initialHighRes",
        options.initialHighRes,
        `VirtualClock option 'initialHighRes' must be a finite number, got ${options.initialHighRes}`
      )
    );
  }
  if (
    options?.autoAdvance !== undefined &&
    (!Number.isFinite(options.autoAdvance) || options.autoAdvance < 0)
  ) {
    return err(
      createClockRangeError(
        "autoAdvance",
        options.autoAdvance,
        `VirtualClock option 'autoAdvance' must be a non-negative finite number, got ${options.autoAdvance}`
      )
    );
  }

  let monotonic = initialMonotonic;
  let wallClock = initialWallClock;
  let highRes = initialHighRes;
  let autoAdvanceMs = initialAutoAdvance;

  const advanceListeners: Array<(ms: number) => void> = [];

  const doAdvance = (ms: number): void => {
    monotonic += ms;
    wallClock += ms;
    highRes += ms;
    for (const listener of advanceListeners) {
      listener(ms);
    }
  };

  // The VirtualClockAdapterInterface is NOT frozen
  const adapter: VirtualClockAdapterInterface = {
    monotonicNow() {
      const value = asMonotonic(monotonic);
      if (autoAdvanceMs > 0) {
        doAdvance(autoAdvanceMs);
      }
      return value;
    },

    wallClockNow() {
      const value = asWallClock(wallClock);
      // Stryker disable next-line all -- EQUIVALENT: doAdvance(0) is a no-op; CE(true) with advance(0) produces identical observable state
      if (autoAdvanceMs > 0) {
        doAdvance(autoAdvanceMs);
      }
      return value;
    },

    highResNow() {
      const value = asHighRes(highRes);
      // Stryker disable next-line all -- EQUIVALENT: doAdvance(0) is a no-op; CE(true) with advance(0) produces identical observable state
      if (autoAdvanceMs > 0) {
        doAdvance(autoAdvanceMs);
      }
      return value;
    },

    advance(ms: number): Result<void, ClockRangeError> {
      if (ms < 0) {
        return err(createClockRangeError("ms", ms, "advance() requires a non-negative value"));
      }
      doAdvance(ms);
      return ok(undefined);
    },

    set(values: Partial<VirtualClockValues>): Result<void, ClockRangeError> {
      if (values.monotonic !== undefined && !Number.isFinite(values.monotonic)) {
        return err(
          createClockRangeError(
            "monotonic",
            values.monotonic,
            `set() 'monotonic' must be a finite number, got ${values.monotonic}`
          )
        );
      }
      if (values.wallClock !== undefined && !Number.isFinite(values.wallClock)) {
        return err(
          createClockRangeError(
            "wallClock",
            values.wallClock,
            `set() 'wallClock' must be a finite number, got ${values.wallClock}`
          )
        );
      }
      if (values.highRes !== undefined && !Number.isFinite(values.highRes)) {
        return err(
          createClockRangeError(
            "highRes",
            values.highRes,
            `set() 'highRes' must be a finite number, got ${values.highRes}`
          )
        );
      }
      if (values.monotonic !== undefined) {
        monotonic = values.monotonic;
      }
      if (values.wallClock !== undefined) {
        wallClock = values.wallClock;
      }
      if (values.highRes !== undefined) {
        highRes = values.highRes;
      }
      return ok(undefined);
    },

    jumpWallClock(ms: number): Result<void, ClockRangeError> {
      if (!Number.isFinite(ms)) {
        return err(
          createClockRangeError(
            "ms",
            ms,
            `jumpWallClock() 'ms' must be a finite number, got ${ms}`
          )
        );
      }
      wallClock += ms;
      highRes += ms;
      // monotonic is intentionally NOT affected
      return ok(undefined);
    },

    setAutoAdvance(ms: number): Result<void, ClockRangeError> {
      if (!Number.isFinite(ms) || ms < 0) {
        return err(
          createClockRangeError(
            "ms",
            ms,
            `setAutoAdvance() 'ms' must be a non-negative finite number, got ${ms}`
          )
        );
      }
      autoAdvanceMs = ms;
      return ok(undefined);
    },

    getAutoAdvance(): number {
      return autoAdvanceMs;
    },

    _onAdvance(callback: (ms: number) => void): void {
      advanceListeners.push(callback);
    },
  };

  return ok(adapter);
}

/** Virtual clock adapter constant — transient lifetime for test isolation. */
export const VirtualClockTestAdapter = createAdapter({
  provides: ClockPort,
  requires: [],
  lifetime: "transient",
  // Stryker disable next-line ArrowFunction -- EQUIVALENT: DI factory ArrowFunction no-op cannot be killed via direct unit tests
  factory: () => createVirtualClock(),
});
