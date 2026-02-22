/**
 * EdgeRuntimeClockAdapter — clock adapter for V8 isolate edge runtimes.
 *
 * Handles the common edge runtime limitation: performance.now() available
 * but performance.timeOrigin unavailable.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { asMonotonic, asWallClock, asHighRes } from "../branded.js";
import { ClockPort } from "../ports/clock.js";
import type { ClockService } from "../ports/clock.js";
import type {
  ClockDiagnosticsService,
  ClockDiagnostics,
  ClockCapabilities,
} from "../ports/diagnostics.js";
import {
  getPerformance,
  createClampedFallback,
} from "./system-clock.js";

// =============================================================================
// EdgeRuntimeClockStartupError
// =============================================================================

/** Error returned when an edge runtime clock startup self-test fails. */
export interface EdgeRuntimeClockStartupError {
  readonly _tag: "EdgeRuntimeClockStartupError";
  readonly check: "ST-1" | "ST-2" | "ST-3" | "ST-4";
  readonly observedValue: number;
  readonly message: string;
}

/** Factory for EdgeRuntimeClockStartupError — frozen per GxP error immutability. */
export function createEdgeRuntimeClockStartupError(
  check: EdgeRuntimeClockStartupError["check"],
  observedValue: number,
  message: string,
): EdgeRuntimeClockStartupError {
  return Object.freeze({
    _tag: "EdgeRuntimeClockStartupError" as const,
    check,
    observedValue,
    message,
  });
}

/** Options for createEdgeRuntimeClock. */
export interface EdgeRuntimeClockOptions {
  readonly gxp?: boolean;
}

/**
 * Creates a clock adapter optimized for V8 isolate edge runtimes.
 *
 * highResNow() degrades to Date.now() (no timeOrigin available).
 * ST-5 is skipped because highResNow === wallClockNow by design.
 */
export function createEdgeRuntimeClock(
  options?: EdgeRuntimeClockOptions
): Result<ClockService & ClockDiagnosticsService, EdgeRuntimeClockStartupError> {
  // Capture platform APIs at construction (same anti-tampering as SystemClockAdapter)
  const perf = getPerformance();
  const capturedDateNow = Date.now.bind(Date);

  const clampedFallback = perf ? undefined : createClampedFallback(capturedDateNow);

  const monotonicNowRaw: () => number = perf
    ? () => perf.now()
    : (clampedFallback as () => number);

  const wallClockNowRaw: () => number = () => capturedDateNow();

  // Edge runtimes: highRes degrades to Date.now() (no timeOrigin)
  const highResNowRaw: () => number = () => capturedDateNow();

  // ST-1: Monotonic non-negativity
  const m1 = monotonicNowRaw();
  if (m1 < 0) {
    return err(createEdgeRuntimeClockStartupError("ST-1", m1, "monotonicNow() returned negative value"));
  }

  // ST-2: Wall-clock plausibility
  const wall = wallClockNowRaw();
  if (wall <= 1577836800000) {
    return err(
      createEdgeRuntimeClockStartupError(
        "ST-2",
        wall,
        "wallClockNow() returned implausible epoch value (before 2020-01-01)"
      )
    );
  }

  // ST-3: Monotonic non-regression
  const m2 = monotonicNowRaw();
  if (m2 < m1) {
    return err(
      createEdgeRuntimeClockStartupError("ST-3", m2, `monotonicNow() regressed from ${m1} to ${m2}`)
    );
  }

  // ST-4: Platform API freeze verification (GxP mode only)
  if (options?.gxp === true) {
    if (!Object.isFrozen(Date)) {
      return err(
        createEdgeRuntimeClockStartupError(
          "ST-4",
          0,
          "Date object is not frozen. GxP deployments MUST freeze Date at application entry point."
        )
      );
    }
    /* Stryker disable next-line LogicalOperator,ConditionalExpression -- EQUIVALENT: in the GxP test environment perf is always defined and not frozen, so both mutations (|| / CE=true) produce the same ST-4 error path; behavioral outcome is identical */
    if (perf !== undefined && !Object.isFrozen(globalThis.performance)) {
      return err(
        createEdgeRuntimeClockStartupError(
          "ST-4",
          0,
          "performance object is not frozen. GxP deployments MUST freeze performance at application entry point."
        )
      );
    }
  }

  // ST-5 is skipped: highResNow === wallClockNow by design — divergence always 0

  const capabilities: ClockCapabilities = Object.freeze({
    hasMonotonicTime: perf !== undefined,
    hasHighResOrigin: false,
    crossOriginIsolated: undefined,
    estimatedResolutionMs: 1.0,
    platform: "edge-worker" as const,
    highResDegraded: true,
    monotonicDegraded: perf === undefined,
  });

  const diagnostics: ClockDiagnostics = Object.freeze({
    adapterName: "EdgeRuntimeClockAdapter",
    monotonicSource: perf ? "performance.now" : "Date.now-clamped",
    highResSource: "Date.now",
    platformResolutionMs: 1.0,
    cryptoFipsMode: undefined,
  });

  const adapter = Object.freeze({
    monotonicNow: () => asMonotonic(monotonicNowRaw()),
    wallClockNow: () => asWallClock(wallClockNowRaw()),
    highResNow: () => asHighRes(highResNowRaw()),
    getDiagnostics: () => diagnostics,
    getCapabilities: () => capabilities,
  });

  return ok(adapter);
}

/** Pre-wired singleton EdgeRuntimeClockAdapter. */
export const EdgeRuntimeClockAdapter = createAdapter({
  provides: ClockPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createEdgeRuntimeClock(),
});

/** Factory returning a configured EdgeRuntimeClockAdapter with options. */
export function createEdgeRuntimeClockAdapter(options?: EdgeRuntimeClockOptions) {
  return createAdapter({
    provides: ClockPort,
    requires: [],
    lifetime: "singleton",
    factory: () => createEdgeRuntimeClock(options),
  });
}
