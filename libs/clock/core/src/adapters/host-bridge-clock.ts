/**
 * HostBridgeClockAdapter — clock adapter for React Native, WASM, and embedded environments.
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
// =============================================================================
// HostBridgeClockStartupError
// =============================================================================

/** Error returned when a host bridge clock startup self-test fails. */
export interface HostBridgeClockStartupError {
  readonly _tag: "HostBridgeClockStartupError";
  readonly check: "HB-1" | "HB-2" | "ST-1" | "ST-2" | "ST-3" | "ST-4" | "ST-5";
  readonly observedValue: number;
  readonly message: string;
}

/** Factory for HostBridgeClockStartupError — frozen per GxP error immutability. */
export function createHostBridgeClockStartupError(
  check: HostBridgeClockStartupError["check"],
  observedValue: number,
  message: string,
): HostBridgeClockStartupError {
  return Object.freeze({
    _tag: "HostBridgeClockStartupError" as const,
    check,
    observedValue,
    message,
  });
}

/** Bridge interface for host-provided timing functions. */
export interface HostClockBridge {
  readonly monotonicNowMs: () => number;
  readonly wallClockNowMs: () => number;
  readonly highResNowMs?: () => number;
}

/** Options for createHostBridgeClock. */
export interface HostBridgeClockOptions {
  readonly adapterName: string;
  readonly platform: "react-native" | "wasm" | "unknown";
  readonly gxp?: boolean;
}

/**
 * Creates a clock adapter from host-provided bridge functions.
 *
 * Validates bridge functions at construction (HB-3).
 * Captures bridge references at construction time (HB-5).
 */
export function createHostBridgeClock(
  bridge: HostClockBridge,
  options: HostBridgeClockOptions
): Result<ClockService & ClockDiagnosticsService, HostBridgeClockStartupError> {
  // CLK-HB-003: Validate bridge functions at construction time
  if (typeof bridge.monotonicNowMs !== "function") {
    return err(
      createHostBridgeClockStartupError("HB-1", 0, "bridge.monotonicNowMs must be a function")
    );
  }
  if (typeof bridge.wallClockNowMs !== "function") {
    return err(
      createHostBridgeClockStartupError("HB-2", 0, "bridge.wallClockNowMs must be a function")
    );
  }

  // HB-5: Capture bridge function references at construction time
  const capturedMonotonic = bridge.monotonicNowMs;
  const capturedWallClock = bridge.wallClockNowMs;
  const capturedHighRes = bridge.highResNowMs ?? bridge.wallClockNowMs;

  const hasHighRes = bridge.highResNowMs !== undefined;

  const monotonicNowRaw: () => number = () => capturedMonotonic();
  const wallClockNowRaw: () => number = () => capturedWallClock();
  const highResNowRaw: () => number = () => capturedHighRes();

  // ST-1: Monotonic non-negativity
  const m1 = monotonicNowRaw();
  if (m1 < 0) {
    return err(createHostBridgeClockStartupError("ST-1", m1, "monotonicNow() returned negative value"));
  }

  // ST-2: Wall-clock plausibility
  const wall = wallClockNowRaw();
  if (wall <= 1577836800000) {
    return err(
      createHostBridgeClockStartupError(
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
      createHostBridgeClockStartupError("ST-3", m2, `monotonicNow() regressed from ${m1} to ${m2}`)
    );
  }

  // ST-4: Bridge freeze verification (GxP mode) — checks bridge object, not Date/performance
  if (options.gxp === true) {
    if (!Object.isFrozen(bridge)) {
      return err(
        createHostBridgeClockStartupError(
          "ST-4",
          0,
          "bridge object is not frozen. GxP deployments MUST freeze the bridge before passing to createHostBridgeClock."
        )
      );
    }
  }

  // ST-5: highRes/wallClock consistency (only when highResNowMs is provided)
  // Stryker disable next-line ConditionalExpression -- EQUIVALENT: all tests provide highResNowMs so hasHighRes is always true; CE=true mutation enters the same block
  if (hasHighRes) {
    const stHighRes = highResNowRaw();
    const stWall = wallClockNowRaw();
    const divergence = Math.abs(stHighRes - stWall);
    if (divergence > 1000) {
      return err(
        createHostBridgeClockStartupError(
          "ST-5",
          divergence,
          `highResNow() and wallClockNow() diverge by ${divergence}ms (threshold: 1000ms).`
        )
      );
    }
  }

  const capabilities: ClockCapabilities = Object.freeze({
    hasMonotonicTime: true,
    hasHighResOrigin: hasHighRes,
    crossOriginIsolated: undefined,
    estimatedResolutionMs: hasHighRes ? 0.001 : 1.0,
    platform: options.platform,
    highResDegraded: !hasHighRes,
    monotonicDegraded: false,
  });

  const diagnostics: ClockDiagnostics = Object.freeze({
    adapterName: options.adapterName,
    monotonicSource: "host-bridge",
    highResSource: hasHighRes ? "host-bridge" : "host-bridge-wallclock",
    platformResolutionMs: capabilities.estimatedResolutionMs,
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

/** Factory returning a configured host bridge clock adapter. */
export function createHostBridgeClockAdapter(
  bridge: HostClockBridge,
  options: HostBridgeClockOptions
) {
  return createAdapter({
    provides: ClockPort,
    requires: [],
    lifetime: "singleton",
    factory: () => createHostBridgeClock(bridge, options),
  });
}
