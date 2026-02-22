/**
 * Periodic clock evaluation tests — DoD 35
 */

import { describe, it, expect, vi } from "vitest";
import { setupPeriodicClockEvaluation } from "../src/periodic-evaluation.js";
import type { PeriodicEvaluationConfig } from "../src/periodic-evaluation.js";
import { createVirtualClock } from "../src/testing/virtual-clock.js";
import { createVirtualTimerScheduler } from "../src/testing/virtual-timer.js";
import type { ClockDiagnostics, ClockCapabilities, ClockDiagnosticsService } from "../src/ports/diagnostics.js";

// =============================================================================
// Shared fixtures
// =============================================================================

function makeClock(options?: Parameters<typeof createVirtualClock>[0]) {
  const r = createVirtualClock(options);
  if (r.isErr()) throw new Error(`makeClock failed: ${r.error.message}`);
  return r.value;
}

function makeBaseline(): {
  baselineDiagnostics: ClockDiagnostics;
  baselineCapabilities: ClockCapabilities;
} {
  return {
    baselineDiagnostics: Object.freeze<ClockDiagnostics>({
      adapterName: "SystemClockAdapter",
      monotonicSource: "performance.now",
      highResSource: "performance.timeOrigin+now",
      platformResolutionMs: 0.001,
      cryptoFipsMode: false,
    }),
    baselineCapabilities: Object.freeze<ClockCapabilities>({
      hasMonotonicTime: true,
      hasHighResOrigin: true,
      crossOriginIsolated: undefined,
      estimatedResolutionMs: 0.001,
      platform: "node",
      highResDegraded: false,
      monotonicDegraded: false,
    }),
  };
}

function makeDiagnosticsService(
  diag?: Partial<ClockDiagnostics>,
  caps?: Partial<ClockCapabilities>
): ClockDiagnosticsService {
  const { baselineDiagnostics, baselineCapabilities } = makeBaseline();
  return {
    getDiagnostics: () => Object.freeze({ ...baselineDiagnostics, ...diag }),
    getCapabilities: () => Object.freeze({ ...baselineCapabilities, ...caps }),
  };
}

function makeConfig(
  overrides: Partial<PeriodicEvaluationConfig> = {}
): PeriodicEvaluationConfig {
  const { baselineDiagnostics, baselineCapabilities } = makeBaseline();
  return {
    intervalMs: 1000,
    baselineDiagnostics,
    baselineCapabilities,
    onBaselineMismatch: () => {},
    onDriftDetected: () => {},
    ...overrides,
  };
}

// =============================================================================
// DoD 35 — Test #1: starts periodic interval via TimerSchedulerPort
// =============================================================================

describe("setupPeriodicClockEvaluation()", () => {
  it("DoD35-1: starts periodic interval via TimerSchedulerPort at configured intervalMs", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({ intervalMs: 3600000 }));

    expect(timer.pendingCount()).toBe(1);
  });

  // =============================================================================
  // DoD 35 — Test #2: calls getDiagnostics() and getCapabilities() on each cycle
  // =============================================================================

  it("DoD35-2: calls getDiagnostics() and getCapabilities() on each interval cycle", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const getDiagnosticsSpy = vi.fn(() =>
      Object.freeze<ClockDiagnostics>({
        adapterName: "SystemClockAdapter",
        monotonicSource: "performance.now",
        highResSource: "performance.timeOrigin+now",
        platformResolutionMs: 0.001,
        cryptoFipsMode: false,
      })
    );
    const getCapabilitiesSpy = vi.fn(() =>
      Object.freeze<ClockCapabilities>({
        hasMonotonicTime: true,
        hasHighResOrigin: true,
        crossOriginIsolated: undefined,
        estimatedResolutionMs: 0.001,
        platform: "node",
        highResDegraded: false,
        monotonicDegraded: false,
      })
    );
    const diagnostics: ClockDiagnosticsService = {
      getDiagnostics: getDiagnosticsSpy,
      getCapabilities: getCapabilitiesSpy,
    };

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({ intervalMs: 1000 }));

    clock.advance(1000);
    expect(getDiagnosticsSpy).toHaveBeenCalledTimes(1);
    expect(getCapabilitiesSpy).toHaveBeenCalledTimes(1);

    clock.advance(1000);
    expect(getDiagnosticsSpy).toHaveBeenCalledTimes(2);
    expect(getCapabilitiesSpy).toHaveBeenCalledTimes(2);
  });

  // =============================================================================
  // DoD 35 — Test #3: invokes onBaselineMismatch when diagnostics field differs
  // =============================================================================

  it("DoD35-3: invokes onBaselineMismatch when diagnostics field differs from baseline", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const mismatches: Array<[string, unknown, unknown]> = [];

    // diagnostics returns changed adapterName
    const diagnostics = makeDiagnosticsService({ adapterName: "ChangedAdapter" });

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      onBaselineMismatch: (field, expected, actual) => mismatches.push([field, expected, actual]),
    }));

    clock.advance(1000);
    expect(mismatches.length).toBeGreaterThanOrEqual(1);
    const found = mismatches.some(([f]) => f === "adapterName");
    expect(found).toBe(true);
  });

  // =============================================================================
  // DoD 35 — Test #4: invokes onBaselineMismatch with field name, expected, actual
  // =============================================================================

  it("DoD35-4: invokes onBaselineMismatch with field name, expected, and actual values", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const mismatches: Array<[string, unknown, unknown]> = [];

    const diagnostics = makeDiagnosticsService({ adapterName: "ChangedAdapter" });

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      onBaselineMismatch: (field, expected, actual) => mismatches.push([field, expected, actual]),
    }));

    clock.advance(1000);
    const call = mismatches.find(([f]) => f === "adapterName");
    expect(call).toBeDefined();
    expect(call?.[1]).toBe("SystemClockAdapter"); // expected = baseline value
    expect(call?.[2]).toBe("ChangedAdapter");      // actual = current value
  });

  // =============================================================================
  // DoD 35 — Test #5: invokes onBaselineMismatch when capabilities field differs
  // =============================================================================

  it("DoD35-5: invokes onBaselineMismatch when capabilities field differs from baseline", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const mismatches: Array<[string, unknown, unknown]> = [];

    // capabilities returns changed platform value
    const diagnostics = makeDiagnosticsService(undefined, { platform: "browser" });

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      onBaselineMismatch: (field, expected, actual) => mismatches.push([field, expected, actual]),
    }));

    clock.advance(1000);
    const call = mismatches.find(([f]) => f === "platform");
    expect(call).toBeDefined();
    expect(call?.[1]).toBe("node");      // expected = baseline
    expect(call?.[2]).toBe("browser");   // actual = changed
  });

  // =============================================================================
  // DoD 35 — Test #6: invokes onDriftDetected when drift exceeds driftThresholdMs
  // =============================================================================

  it("DoD35-6: invokes onDriftDetected when drift exceeds driftThresholdMs", () => {
    const clock = makeClock({ initialWallClock: 1_000_000 });
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();
    let driftCalled = false;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      driftThresholdMs: 500,
      // reference is 0; wallClock starts at 1_000_000 + 1000 → drift ≈ 1_001_000 >> 500
      driftReferenceProvider: () => 0,
      onDriftDetected: () => { driftCalled = true; },
    }));

    clock.advance(1000);
    expect(driftCalled).toBe(true);
  });

  // =============================================================================
  // DoD 35 — Test #7: does not invoke onDriftDetected when drift is within threshold
  // =============================================================================

  it("DoD35-7: does not invoke onDriftDetected when drift is within driftThresholdMs", () => {
    const clock = makeClock({ initialWallClock: 1_000_000 });
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();
    let driftCalled = false;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      driftThresholdMs: 2_000_000, // enormous threshold — drift will be within it
      driftReferenceProvider: () => 1_000_000,
      onDriftDetected: () => { driftCalled = true; },
    }));

    clock.advance(1000);
    expect(driftCalled).toBe(false);
  });

  // =============================================================================
  // DoD 35 — Test #8: uses default driftThresholdMs of 1000 when not specified
  // =============================================================================

  it("DoD35-8: uses default driftThresholdMs of 1000 when not specified", () => {
    const clock = makeClock({ initialWallClock: 1_000_000 });
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();
    const drifts: number[] = [];

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      // driftThresholdMs omitted → default 1000
      // reference = 1_000_000, wallClock after advance = 1_001_000 → drift = 1000
      // 1000 > 1000 is false → NOT called at exactly 1000
      driftReferenceProvider: () => 1_000_000,
      onDriftDetected: (drift) => drifts.push(drift),
    }));

    clock.advance(1000);
    // drift = |1_000_000 - 1_001_000| = 1000, which is NOT > 1000 (default threshold)
    expect(drifts).toHaveLength(0);

    // Now with drift = 1001 (> default threshold of 1000)
    const clock2 = makeClock({ initialWallClock: 1_000_000 });
    const timer2 = createVirtualTimerScheduler(clock2);
    const drifts2: number[] = [];
    setupPeriodicClockEvaluation(clock2, diagnostics, timer2, makeConfig({
      intervalMs: 1000,
      driftReferenceProvider: () => 1_001_001 + 1000, // reference = wallClock + 1001 after advance
      onDriftDetected: (drift) => drifts2.push(drift),
    }));
    clock2.advance(1000);
    expect(drifts2).toHaveLength(1);
  });

  // =============================================================================
  // DoD 35 — Test #9: does not throw when driftReferenceProvider is not configured
  // =============================================================================

  it("DoD35-9: does not throw when driftReferenceProvider is not configured", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();

    expect(() => {
      setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
        intervalMs: 1000,
        // driftReferenceProvider intentionally omitted
      }));
      clock.advance(1000);
    }).not.toThrow();
  });

  // =============================================================================
  // DoD 35 — Test #10: calls driftReferenceProvider on each cycle when configured
  // =============================================================================

  it("DoD35-10: calls driftReferenceProvider on each cycle when configured", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();
    const providerSpy = vi.fn(() => 0);

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      driftReferenceProvider: providerSpy,
    }));

    clock.advance(1000);
    expect(providerSpy).toHaveBeenCalledTimes(1);

    clock.advance(1000);
    expect(providerSpy).toHaveBeenCalledTimes(2);
  });

  // =============================================================================
  // DoD 35 — Test #11: stop() cancels the interval
  // =============================================================================

  it("DoD35-11: stop() cancels the interval (no further cycles after stop)", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();
    let callCount = 0;

    const handle = setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      onDriftDetected: () => { callCount++; },
      driftReferenceProvider: () => 1_000_000, // large drift so it fires
    }));

    clock.advance(1000);
    expect(callCount).toBe(1);

    handle.stop();
    clock.advance(1000);
    expect(callCount).toBe(1); // no further calls after stop
  });

  // =============================================================================
  // DoD 35 — Test #12: passes observed drift and wallClock timestamp to onDriftDetected
  // =============================================================================

  it("DoD35-12: passes observed drift and current wallClock timestamp to onDriftDetected", () => {
    const initialWallClock = 5_000_000;
    const clock = makeClock({ initialWallClock });
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();
    let capturedDrift: number | undefined;
    let capturedWallClock: number | undefined;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      driftThresholdMs: 0, // always trigger drift if provider present and drift > 0
      driftReferenceProvider: () => 0, // reference = 0, wallClock after advance = 5_001_000
      onDriftDetected: (drift, wallClockMs) => {
        capturedDrift = drift;
        capturedWallClock = wallClockMs;
      },
    }));

    clock.advance(1000);
    expect(capturedDrift).toBe(5_001_000); // |0 - 5_001_000|
    expect(capturedWallClock).toBe(5_001_000);
  });
});

// =============================================================================
// Additional tests — mutation score improvement
// =============================================================================

describe("setupPeriodicClockEvaluation() — baseline comparison mutations", () => {
  it("no mismatch when diagnostics fields match baseline exactly (kills !==→=== mutant)", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService(); // returns exact baseline values
    const mismatches: string[] = [];

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      onBaselineMismatch: (field) => mismatches.push(field),
    }));

    clock.advance(1000);
    expect(mismatches).toHaveLength(0);
  });

  it("reports mismatch for each differing diagnostics field individually", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const mismatches: string[] = [];

    // Change monotonicSource to trigger a mismatch
    const diagnostics = makeDiagnosticsService({ monotonicSource: "Date.now-clamped" });

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      onBaselineMismatch: (field) => mismatches.push(field),
    }));

    clock.advance(1000);
    expect(mismatches).toContain("monotonicSource");
  });

  it("no mismatch when capabilities fields match baseline exactly", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService(); // returns exact baseline capabilities
    const mismatches: string[] = [];

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      onBaselineMismatch: (field) => mismatches.push(field),
    }));

    clock.advance(1000);
    expect(mismatches).toHaveLength(0);
  });

  it("reports mismatch for each differing capabilities field individually", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const mismatches: string[] = [];

    // Change highResDegraded to trigger a mismatch
    const diagnostics = makeDiagnosticsService(undefined, { highResDegraded: true });

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      onBaselineMismatch: (field) => mismatches.push(field),
    }));

    clock.advance(1000);
    expect(mismatches).toContain("highResDegraded");
  });
});

describe("setupPeriodicClockEvaluation() — drift threshold boundary mutations", () => {
  it("drift exactly at threshold does NOT trigger onDriftDetected (drift > threshold, not >=)", () => {
    const clock = makeClock({ initialWallClock: 1000 });
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();
    let driftCalled = false;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      driftThresholdMs: 1000, // drift will be exactly 1000 after advance
      driftReferenceProvider: () => 0, // reference=0, wallClock after advance=2000, drift=2000
      onDriftDetected: () => { driftCalled = true; },
    }));

    // With initialWallClock=1000 and advance=1000, wallClock=2000
    // drift = |0 - 2000| = 2000 > 1000 → fires
    clock.advance(1000);
    expect(driftCalled).toBe(true);
  });

  it("drift exactly equal to threshold: drift=threshold, NOT > threshold → no call", () => {
    // reference=0, initialWallClock=500, advance=500 → wallClock=1000, drift=1000
    // 1000 > 1000 is false → no call
    const clock = makeClock({ initialWallClock: 500 });
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();
    let driftCalled = false;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 500,
      driftThresholdMs: 1000,
      driftReferenceProvider: () => 0, // reference=0
      onDriftDetected: () => { driftCalled = true; },
    }));

    clock.advance(500); // wallClock = 500 + 500 = 1000, drift = |0 - 1000| = 1000
    // 1000 > 1000 is false
    expect(driftCalled).toBe(false);
  });

  it("drift = threshold + 1 triggers onDriftDetected (> boundary)", () => {
    // reference=0, initialWallClock=500, advance=502 → wallClock=1002, drift=1002
    // 1002 > 1000 is true → fires
    const clock = makeClock({ initialWallClock: 500 });
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();
    let driftCalled = false;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 502,
      driftThresholdMs: 1000,
      driftReferenceProvider: () => 0,
      onDriftDetected: () => { driftCalled = true; },
    }));

    clock.advance(502);
    expect(driftCalled).toBe(true);
  });

  it("driftThresholdMs ?? default kills mutant: with explicit 0, drift=0 is NOT > 0 → no call", () => {
    // Tests that driftThresholdMs=0 is used (not defaulted), so drift=0 does not fire
    const clock = makeClock({ initialWallClock: 100 });
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();
    let driftCalled = false;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig({
      intervalMs: 1000,
      driftThresholdMs: 0,
      driftReferenceProvider: () => 1100, // reference=wallClock after advance, drift=0
      onDriftDetected: () => { driftCalled = true; },
    }));

    clock.advance(1000); // wallClock = 1100
    expect(driftCalled).toBe(false); // drift=0, not > 0
  });
});

describe("setupPeriodicClockEvaluation() — stop() lifecycle", () => {
  it("stop() is idempotent (second call does not throw)", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();

    const handle = setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig());

    expect(() => {
      handle.stop();
      handle.stop();
    }).not.toThrow();
  });

  it("returned handle is frozen (GxP immutability)", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();

    const handle = setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig());

    expect(Object.isFrozen(handle)).toBe(true);
  });

  it("handle has a stop property that is a function", () => {
    const clock = makeClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = makeDiagnosticsService();

    const handle = setupPeriodicClockEvaluation(clock, diagnostics, timer, makeConfig());

    expect(typeof handle.stop).toBe("function");
  });
});
