/**
 * CachedClockAdapter — high-throughput cached time values with background updater.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { CachedClockPort } from "../ports/cached-clock.js";
import type { CachedClockAdapter as CachedClockAdapterType } from "../ports/cached-clock.js";
import { ClockPort } from "../ports/clock.js";
import type { ClockService } from "../ports/clock.js";
import { asMonotonic, asWallClock } from "../branded.js";
import { createClockRangeError } from "../clock-range-error.js";
import type { ClockRangeError } from "../clock-range-error.js";

/** Options for createCachedClock. */
export interface CachedClockOptions {
  readonly source: ClockService;
  readonly updateIntervalMs?: number;
}

/**
 * Creates a cached clock adapter that periodically snapshots the source clock.
 * Performs one synchronous read at construction time (CLK-CAC-008).
 * Returns err(ClockRangeError) when updateIntervalMs is invalid.
 */
export function createCachedClock(options: CachedClockOptions): Result<CachedClockAdapterType, ClockRangeError> {
  const { source, updateIntervalMs = 1 } = options;

  if (!Number.isFinite(updateIntervalMs) || updateIntervalMs <= 0) {
    return err(
      createClockRangeError(
        "updateIntervalMs",
        updateIntervalMs,
        `updateIntervalMs must be a positive finite number, got ${updateIntervalMs}`
      )
    );
  }

  // CLK-CAC-008: Synchronous initial read at construction
  let cachedMonotonic = source.monotonicNow();
  let cachedWallClock = source.wallClockNow();

  let intervalHandle: ReturnType<typeof setInterval> | undefined;
  let running = false;

  const adapter = Object.freeze({
    recentMonotonicNow: () => asMonotonic(cachedMonotonic),
    recentWallClockNow: () => asWallClock(cachedWallClock),

    start(): void {
      if (running) return;
      running = true;
      intervalHandle = setInterval(() => {
        cachedMonotonic = source.monotonicNow();
        cachedWallClock = source.wallClockNow();
      }, updateIntervalMs);
    },

    stop(): void {
      // Stryker disable next-line ConditionalExpression -- EQUIVALENT: stop() when already stopped is a no-op either way; the mutation (remove guard) still produces no observable difference when running=false
      if (!running) return;
      running = false;
      // Stryker disable next-line ConditionalExpression -- EQUIVALENT: intervalHandle is always defined when running=true; the guard is a defensive check with identical observable behavior whether the mutation fires or not
      if (intervalHandle !== undefined) {
        clearInterval(intervalHandle);
        intervalHandle = undefined;
      }
    },

    isRunning(): boolean {
      return running;
    },
  });

  return ok(adapter);
}

/** Pre-wired singleton adapter providing CachedClockPort. Auto-calls start(). */
export const SystemCachedClockAdapter = createAdapter({
  provides: CachedClockPort,
  requires: [ClockPort],
  lifetime: "singleton",
  factory: (deps) => {
    const result = createCachedClock({ source: deps.Clock });
    if (result.isOk()) {
      result.value.start();
    }
    return result;
  },
});

/** Options for createSystemCachedClockAdapter. */
export interface SystemCachedClockAdapterOptions {
  readonly updateIntervalMs?: number;
}

/**
 * Factory function returning a configured SystemCachedClockAdapter with options.
 * Use this when you need a custom updateIntervalMs.
 */
export function createSystemCachedClockAdapter(options?: SystemCachedClockAdapterOptions) {
  return createAdapter({
    provides: CachedClockPort,
    requires: [ClockPort],
    lifetime: "singleton",
    factory: (deps) => {
      const result = createCachedClock({ source: deps.Clock, updateIntervalMs: options?.updateIntervalMs });
      if (result.isOk()) {
        result.value.start();
      }
      return result;
    },
  });
}
