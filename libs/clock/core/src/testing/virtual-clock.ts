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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly _onAdvance?: (callback: (ms: number) => void) => void;
}

const DEFAULT_WALL_CLOCK = 1707753600000; // 2024-02-12T12:00:00Z

/**
 * Creates a virtual clock adapter with fully controllable time.
 *
 * Returns err(ClockRangeError) when options contain non-finite values.
 * NOT frozen — mutable internal state required for advance(), set(), etc.
 */
function validateFiniteOption(
  name: string,
  value: number | undefined
): ClockRangeError | undefined {
  if (value !== undefined && !Number.isFinite(value)) {
    return createClockRangeError(
      name,
      value,
      `VirtualClock option '${name}' must be a finite number, got ${value}`
    );
  }
  return undefined;
}

function validateVirtualClockOptions(options?: VirtualClockOptions): ClockRangeError | undefined {
  if (options === undefined) return undefined;

  const checks: Array<ClockRangeError | undefined> = [
    validateFiniteOption("initialMonotonic", options.initialMonotonic),
    validateFiniteOption("initialWallClock", options.initialWallClock),
    validateFiniteOption("initialHighRes", options.initialHighRes),
  ];

  for (const e of checks) {
    if (e !== undefined) return e;
  }

  if (
    options.autoAdvance !== undefined &&
    (!Number.isFinite(options.autoAdvance) || options.autoAdvance < 0)
  ) {
    return createClockRangeError(
      "autoAdvance",
      options.autoAdvance,
      `VirtualClock option 'autoAdvance' must be a non-negative finite number, got ${options.autoAdvance}`
    );
  }

  return undefined;
}

function validateFiniteField(
  name: string,
  value: number | undefined,
  prefix: string
): ClockRangeError | undefined {
  if (value !== undefined && !Number.isFinite(value)) {
    return createClockRangeError(
      name,
      value,
      `${prefix} '${name}' must be a finite number, got ${value}`
    );
  }
  return undefined;
}

export function createVirtualClock(
  options?: VirtualClockOptions
): Result<VirtualClockAdapterInterface, ClockRangeError> {
  const validationError = validateVirtualClockOptions(options);
  if (validationError !== undefined) return err(validationError);

  const initialWallClock = options?.initialWallClock ?? DEFAULT_WALL_CLOCK;
  let monotonic = options?.initialMonotonic ?? 0;
  let wallClock = initialWallClock;
  let highRes = options?.initialHighRes ?? initialWallClock;
  let autoAdvanceMs = options?.autoAdvance ?? 0;

  const advanceListeners: Array<(ms: number) => void> = [];

  const doAdvance = (ms: number): void => {
    monotonic += ms;
    wallClock += ms;
    highRes += ms;
    for (const listener of advanceListeners) {
      listener(ms);
    }
  };

  const maybeAutoAdvance = (): void => {
    if (autoAdvanceMs > 0) doAdvance(autoAdvanceMs);
  };

  const adapter: VirtualClockAdapterInterface = {
    monotonicNow() {
      const value = asMonotonic(monotonic);
      maybeAutoAdvance();
      return value;
    },

    wallClockNow() {
      const value = asWallClock(wallClock);
      // Stryker disable next-line all -- EQUIVALENT: doAdvance(0) is a no-op; CE(true) with advance(0) produces identical observable state
      maybeAutoAdvance();
      return value;
    },

    highResNow() {
      const value = asHighRes(highRes);
      // Stryker disable next-line all -- EQUIVALENT: doAdvance(0) is a no-op; CE(true) with advance(0) produces identical observable state
      maybeAutoAdvance();
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
      const fieldError =
        validateFiniteField("monotonic", values.monotonic, "set()") ??
        validateFiniteField("wallClock", values.wallClock, "set()") ??
        validateFiniteField("highRes", values.highRes, "set()");
      if (fieldError !== undefined) return err(fieldError);

      if (values.monotonic !== undefined) monotonic = values.monotonic;
      if (values.wallClock !== undefined) wallClock = values.wallClock;
      if (values.highRes !== undefined) highRes = values.highRes;
      return ok(undefined);
    },

    jumpWallClock(ms: number): Result<void, ClockRangeError> {
      if (!Number.isFinite(ms)) {
        return err(
          createClockRangeError("ms", ms, `jumpWallClock() 'ms' must be a finite number, got ${ms}`)
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
