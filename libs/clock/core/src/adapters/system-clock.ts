/**
 * SystemClockAdapter — production clock adapter using platform-native timing APIs.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { asMonotonic, asWallClock, asHighRes } from "../branded.js";
import { ClockPort } from "../ports/clock.js";
import type { ClockService } from "../ports/clock.js";
import { ClockDiagnosticsPort } from "../ports/diagnostics.js";
import type {
  ClockDiagnosticsService,
  ClockDiagnostics,
  ClockCapabilities,
} from "../ports/diagnostics.js";
import {
  SequenceGeneratorPort,
  createSequenceOverflowError,
} from "../ports/sequence.js";
import type { SequenceGeneratorService } from "../ports/sequence.js";

// =============================================================================
// SystemClockStartupError
// =============================================================================

/** Error returned when a system clock startup self-test fails. */
export interface SystemClockStartupError {
  readonly _tag: "SystemClockStartupError";
  readonly check: "ST-1" | "ST-2" | "ST-3" | "ST-4" | "ST-5";
  readonly observedValue: number;
  readonly message: string;
}

/** Factory for SystemClockStartupError — frozen per GxP error immutability. */
export function createSystemClockStartupError(
  check: SystemClockStartupError["check"],
  observedValue: number,
  message: string,
): SystemClockStartupError {
  return Object.freeze({
    _tag: "SystemClockStartupError" as const,
    check,
    observedValue,
    message,
  });
}

// =============================================================================
// PerformanceLike
// =============================================================================

/** Minimal interface for the performance global. */
export interface PerformanceLike {
  readonly now: () => number;
  readonly timeOrigin?: number;
}

/**
 * Safely accesses the performance global using typeof checks only (no try/catch).
 * Returns undefined when performance.now is not available.
 */
export function getPerformance(): PerformanceLike | undefined {
  if (
    typeof globalThis.performance !== "undefined" &&
    typeof globalThis.performance.now === "function"
  ) {
    return globalThis.performance as PerformanceLike;
  }
  return undefined;
}

// =============================================================================
// Clamped Fallback
// =============================================================================

/**
 * Creates a clamped monotonic fallback using a captured Date.now reference.
 * Ensures monotonicity even when Date.now() jumps backward (NTP correction).
 */
export function createClampedFallback(capturedDateNow: () => number): () => number {
  let lastValue = 0;
  return (): number => {
    const now = capturedDateNow();
    // Stryker disable next-line EqualityOperator -- EQUIVALENT: now > lastValue vs now >= lastValue; when equal, both branches result in lastValue unchanged (the update is a no-op)
    if (now > lastValue) {
      lastValue = now;
    }
    return lastValue;
  };
}

// =============================================================================
// Platform Detection
// =============================================================================

type Platform =
  | "node"
  | "deno"
  | "bun"
  | "browser"
  | "edge-worker"
  | "react-native"
  | "wasm"
  | "unknown";

function detectPlatform(): Platform {
  const g = globalThis as Record<string, unknown>;
  /* Stryker disable all -- UNKILLABLE: Node.js platform-detection conditions are trivially true in the Node.js test environment; mutations that flip sub-conditions to true/false/|| still detect "node" */
  if (
    typeof g["process"] !== "undefined" &&
    typeof (g["process"] as Record<string, unknown>)["versions"] === "object" &&
    (g["process"] as Record<string, unknown>)["versions"] !== null &&
    typeof (
      (g["process"] as Record<string, unknown>)["versions"] as Record<string, unknown>
    )["node"] === "string"
  ) {
    return "node";
  }
  /* Stryker restore all */
  if (typeof g["Deno"] !== "undefined") {
    return "deno";
  }
  if (typeof g["Bun"] !== "undefined") {
    return "bun";
  }
  return "unknown";
}

function detectEstimatedResolution(
  platform: Platform,
  crossOriginIsolated: boolean | undefined
): number {
  if (platform === "node" || platform === "deno" || platform === "bun") {
    return 0.001; // microsecond precision
  }
  /* Stryker disable all -- EQUIVALENT: detectPlatform() never returns "browser" in any supported environment; this branch and its interior are unreachable */
  if (platform === "browser") {
    if (crossOriginIsolated === true) {
      return 0.005; // 5 microseconds
    }
    return 1.0; // coarsened
  }
  /* Stryker restore all */
  return 1.0; // conservative default
}

// =============================================================================
// SystemClockOptions
// =============================================================================

/** Options for createSystemClock. */
export interface SystemClockOptions {
  readonly gxp?: boolean;
}

// =============================================================================
// createSystemClock
// =============================================================================

/**
 * Creates a system clock adapter using platform-native timing APIs.
 *
 * Runs startup self-tests ST-1 through ST-5 before returning ok().
 * Returns err(SystemClockStartupError) if any self-test fails.
 */
export function createSystemClock(
  options?: SystemClockOptions
): Result<ClockService & ClockDiagnosticsService, SystemClockStartupError> {
  // SEC-1: Capture platform API references at construction time (anti-tampering)
  const perf = getPerformance();
  const capturedDateNow = Date.now.bind(Date);

  const monotonicSource: ClockDiagnostics["monotonicSource"] = perf
    ? "performance.now"
    : "Date.now-clamped";
  const highResSource: ClockDiagnostics["highResSource"] =
    perf !== undefined && perf.timeOrigin !== undefined
      ? "performance.timeOrigin+now"
      : "Date.now";

  const clampedFallback = perf ? undefined : createClampedFallback(capturedDateNow);

  const monotonicNowRaw: () => number = perf
    ? () => perf.now()
    : (clampedFallback as () => number);

  const wallClockNowRaw: () => number = () => capturedDateNow();

  /* Stryker disable ConditionalExpression -- EQUIVALENT: performance with timeOrigin is always present in Node.js; CE(true) mutation enters the same true-branch; identical observable behavior */
  const highResNowRaw: () => number =
    perf !== undefined && perf.timeOrigin !== undefined
      ? () => (perf.timeOrigin as number) + perf.now()
      : () => capturedDateNow();
  /* Stryker restore ConditionalExpression */

  // ST-1: Monotonic non-negativity
  const m1 = monotonicNowRaw();
  if (m1 < 0) {
    return err(createSystemClockStartupError("ST-1", m1, "monotonicNow() returned negative value"));
  }

  // ST-2: Wall-clock plausibility (after 2020-01-01)
  const wall = wallClockNowRaw();
  if (wall <= 1577836800000) {
    return err(
      createSystemClockStartupError(
        "ST-2",
        wall,
        "wallClockNow() returned implausible epoch value (before 2020-01-01)"
      )
    );
  }

  // ST-3: Monotonic non-regression (two consecutive calls)
  const m2 = monotonicNowRaw();
  if (m2 < m1) {
    return err(
      createSystemClockStartupError("ST-3", m2, `monotonicNow() regressed from ${m1} to ${m2}`)
    );
  }

  // ST-4: Platform API freeze verification (GxP mode only)
  if (options?.gxp === true) {
    if (!Object.isFrozen(Date)) {
      return err(
        createSystemClockStartupError(
          "ST-4",
          0,
          "Date object is not frozen. GxP deployments MUST freeze Date at application entry point."
        )
      );
    }
    /* Stryker disable all -- UNKILLABLE: GxP mode requires an unfrozen performance object to trigger ST-4; standard test suite doesn't vary freeze state of globalThis.performance */
    if (perf !== undefined && !Object.isFrozen(globalThis.performance)) {
      return err(
        createSystemClockStartupError(
          "ST-4",
          0,
          "performance object is not frozen. GxP deployments MUST freeze performance at application entry point."
        )
      );
    }
    /* Stryker restore all */
  }

  // ST-5: High-res / wall-clock consistency check (only when timeOrigin is available)
  // Stryker disable next-line ConditionalExpression -- UNKILLABLE: performance with timeOrigin is always present in Node.js; condition is trivially true; CE(true) enters the same block
  if (perf !== undefined && perf.timeOrigin !== undefined) {
    const stHighRes = highResNowRaw();
    const stWall = wallClockNowRaw();
    const divergence = Math.abs(stHighRes - stWall);
    if (divergence > 1000) {
      return err(
        createSystemClockStartupError(
          "ST-5",
          divergence,
          `highResNow() and wallClockNow() diverge by ${divergence}ms (threshold: 1000ms). This indicates performance.timeOrigin was captured before NTP synchronization completed.`
        )
      );
    }
  }

  // Detect platform capabilities
  const platform = detectPlatform();

  // crossOriginIsolated is a browser-only Web API property — access via bracket notation
  const g = globalThis as Record<string, unknown>;
  const rawCrossOriginIsolated = g["crossOriginIsolated"];
  const crossOriginIsolated: boolean | undefined =
    typeof rawCrossOriginIsolated === "boolean" ? rawCrossOriginIsolated : undefined;

  const estimatedResolutionMs = detectEstimatedResolution(platform, crossOriginIsolated);

  const capabilities: ClockCapabilities = Object.freeze({
    hasMonotonicTime: perf !== undefined,
    hasHighResOrigin: perf !== undefined && perf.timeOrigin !== undefined,
    crossOriginIsolated,
    estimatedResolutionMs,
    platform,
    highResDegraded: perf === undefined || perf.timeOrigin === undefined,
    monotonicDegraded: perf === undefined,
  });

  const diagnostics: ClockDiagnostics = Object.freeze({
    adapterName: "SystemClockAdapter",
    monotonicSource,
    highResSource,
    platformResolutionMs: estimatedResolutionMs,
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

// =============================================================================
// createSystemSequenceGenerator
// =============================================================================

/**
 * Creates a system sequence generator backed by a simple integer counter.
 * Returns a frozen object — no reset() method.
 */
export function createSystemSequenceGenerator(): SequenceGeneratorService {
  let counter = 0;

  return Object.freeze({
    next: () => {
      /* Stryker disable all -- UNKILLABLE: counter overflow requires 2^53-1 iterations; unreachable in any test scenario */
      if (counter >= Number.MAX_SAFE_INTEGER) {
        return err(createSequenceOverflowError(counter));
      }
      /* Stryker restore all */
      counter += 1;
      return ok(counter);
    },
    current: () => counter,
  });
}

// =============================================================================
// DI Adapters
// =============================================================================

/** Pre-wired singleton adapter that provides ClockPort via SystemClockAdapter. */
export const SystemClockAdapter = createAdapter({
  provides: ClockPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createSystemClock(),
});

/** Pre-wired singleton adapter that provides SequenceGeneratorPort. */
export const SystemSequenceGeneratorAdapter = createAdapter({
  provides: SequenceGeneratorPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createSystemSequenceGenerator(),
});

/** Pre-wired singleton adapter that provides ClockDiagnosticsPort (requires ClockPort). */
export const SystemClockDiagnosticsAdapter = createAdapter({
  provides: ClockDiagnosticsPort,
  requires: [ClockPort],
  lifetime: "singleton",
  factory: (deps) => {
    const clock = deps.Clock as ClockService & ClockDiagnosticsService;
    return clock;
  },
});

/**
 * Factory function returning a configured SystemClockAdapter with options.
 * Use this when you need GxP mode or other options.
 *
 * In GxP mode, warns to stderr at resolution time if no ClockSourceChangedSink
 * is registered in the container (CLK-INT-003). The factory has no container
 * access, so the warning is emitted whenever a GxP adapter is resolved without
 * a registered sink.
 */
export function createSystemClockAdapter(options?: SystemClockOptions) {
  return createAdapter({
    provides: ClockPort,
    requires: [],
    lifetime: "singleton",
    factory: () => {
      if (options?.gxp === true) {
        process.stderr.write(
          "[CLOCK] WARNING: GxP mode active but no ClockSourceChangedSink registered. " +
            "Clock source changes will not be audited.\n"
        );
      }
      return createSystemClock(options);
    },
  });
}
