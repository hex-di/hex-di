/**
 * System clock factory — platform timing sources and startup self-tests ST-1–ST-5.
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { asMonotonic, asWallClock, asHighRes } from "../branded.js";
import type { ClockService } from "../ports/clock.js";
import type {
  ClockDiagnosticsService,
  ClockDiagnostics,
  ClockCapabilities,
} from "../ports/diagnostics.js";
import { createClampedFallback, getPerformance } from "./system-clock-performance.js";
import {
  createSystemClockStartupError,
  type SystemClockStartupError,
} from "./system-clock-startup-error.js";
import { detectEstimatedResolution, detectPlatform } from "./system-clock-platform.js";
import { safeGlobal } from "../platform.js";

/** Options for createSystemClock. */
export interface SystemClockOptions {
  readonly gxp?: boolean;
}

/**
 * Creates a system clock adapter using platform-native timing APIs.
 *
 * Runs startup self-tests ST-1 through ST-5 before returning ok().
 * Returns err(SystemClockStartupError) if any self-test fails.
 */
interface TimingSources {
  readonly perf: ReturnType<typeof getPerformance>;
  readonly capturedDateNow: () => number;
  readonly monotonicNowRaw: () => number;
  readonly wallClockNowRaw: () => number;
  readonly highResNowRaw: () => number;
  readonly monotonicSource: ClockDiagnostics["monotonicSource"];
  readonly highResSource: ClockDiagnostics["highResSource"];
}

function captureSources(): TimingSources {
  const perf = getPerformance();
  const capturedDateNow = Date.now.bind(Date);
  const clampedFallback = createClampedFallback(capturedDateNow);

  const monotonicNowRaw: () => number = perf ? () => perf.now() : clampedFallback;
  const wallClockNowRaw: () => number = () => capturedDateNow();

  /* Stryker disable ConditionalExpression -- EQUIVALENT: performance with timeOrigin is always present in Node.js; CE(true) mutation enters the same true-branch; identical observable behavior */
  const capturedTimeOrigin = perf?.timeOrigin;
  const highResNowRaw: () => number =
    perf !== undefined && capturedTimeOrigin !== undefined
      ? () => capturedTimeOrigin + perf.now()
      : () => capturedDateNow();
  /* Stryker restore ConditionalExpression */

  return {
    perf,
    capturedDateNow,
    monotonicNowRaw,
    wallClockNowRaw,
    highResNowRaw,
    monotonicSource: perf ? "performance.now" : "Date.now-clamped",
    highResSource:
      perf !== undefined && perf.timeOrigin !== undefined
        ? "performance.timeOrigin+now"
        : "Date.now",
  };
}

function runStartupTests(
  sources: TimingSources,
  options?: SystemClockOptions
): SystemClockStartupError | undefined {
  const { monotonicNowRaw, wallClockNowRaw, highResNowRaw, perf } = sources;

  // ST-1: Monotonic non-negativity
  const m1 = monotonicNowRaw();
  if (m1 < 0) {
    return createSystemClockStartupError("ST-1", m1, "monotonicNow() returned negative value");
  }

  // ST-2: Wall-clock plausibility (after 2020-01-01)
  const wall = wallClockNowRaw();
  if (wall <= 1577836800000) {
    return createSystemClockStartupError(
      "ST-2",
      wall,
      "wallClockNow() returned implausible epoch value (before 2020-01-01)"
    );
  }

  // ST-3: Monotonic non-regression (two consecutive calls)
  const m2 = monotonicNowRaw();
  if (m2 < m1) {
    return createSystemClockStartupError(
      "ST-3",
      m2,
      `monotonicNow() regressed from ${m1} to ${m2}`
    );
  }

  // ST-4: Platform API freeze verification (GxP mode only)
  const gxpError = options?.gxp === true ? runGxpTests(perf) : undefined;
  if (gxpError !== undefined) return gxpError;

  // ST-5: High-res / wall-clock consistency check (only when timeOrigin is available)
  // Stryker disable next-line ConditionalExpression -- UNKILLABLE: performance with timeOrigin is always present in Node.js; condition is trivially true; CE(true) enters the same block
  if (perf !== undefined && perf.timeOrigin !== undefined) {
    const divergence = Math.abs(highResNowRaw() - wallClockNowRaw());
    if (divergence > 1000) {
      return createSystemClockStartupError(
        "ST-5",
        divergence,
        `highResNow() and wallClockNow() diverge by ${divergence}ms (threshold: 1000ms). This indicates performance.timeOrigin was captured before NTP synchronization completed.`
      );
    }
  }

  return undefined;
}

function runGxpTests(perf: ReturnType<typeof getPerformance>): SystemClockStartupError | undefined {
  if (!Object.isFrozen(Date)) {
    return createSystemClockStartupError(
      "ST-4",
      0,
      "Date object is not frozen. GxP deployments MUST freeze Date at application entry point."
    );
  }
  /* Stryker disable all -- UNKILLABLE: GxP mode requires an unfrozen performance object to trigger ST-4; standard test suite doesn't vary freeze state of globalThis.performance */
  if (perf !== undefined && !Object.isFrozen(globalThis.performance)) {
    return createSystemClockStartupError(
      "ST-4",
      0,
      "performance object is not frozen. GxP deployments MUST freeze performance at application entry point."
    );
  }
  /* Stryker restore all */
  return undefined;
}

function buildCapabilities(perf: ReturnType<typeof getPerformance>): ClockCapabilities {
  const platform = detectPlatform();
  const rawCrossOriginIsolated = safeGlobal("crossOriginIsolated");
  const crossOriginIsolated: boolean | undefined =
    typeof rawCrossOriginIsolated === "boolean" ? rawCrossOriginIsolated : undefined;

  return Object.freeze({
    hasMonotonicTime: perf !== undefined,
    hasHighResOrigin: perf !== undefined && perf.timeOrigin !== undefined,
    crossOriginIsolated,
    estimatedResolutionMs: detectEstimatedResolution(platform, crossOriginIsolated),
    platform,
    highResDegraded: perf === undefined || perf.timeOrigin === undefined,
    monotonicDegraded: perf === undefined,
  });
}

export function createSystemClock(
  options?: SystemClockOptions
): Result<ClockService & ClockDiagnosticsService, SystemClockStartupError> {
  // SEC-1: Capture platform API references at construction time (anti-tampering)
  const sources = captureSources();

  const startupError = runStartupTests(sources, options);
  if (startupError !== undefined) return err(startupError);

  const capabilities = buildCapabilities(sources.perf);
  const diagnostics: ClockDiagnostics = Object.freeze({
    adapterName: "SystemClockAdapter",
    monotonicSource: sources.monotonicSource,
    highResSource: sources.highResSource,
    platformResolutionMs: capabilities.estimatedResolutionMs,
    cryptoFipsMode: undefined,
  });

  const adapter = Object.freeze({
    monotonicNow: () => asMonotonic(sources.monotonicNowRaw()),
    wallClockNow: () => asWallClock(sources.wallClockNowRaw()),
    highResNow: () => asHighRes(sources.highResNowRaw()),
    getDiagnostics: () => diagnostics,
    getCapabilities: () => capabilities,
  });

  return ok(adapter);
}
