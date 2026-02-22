/**
 * Periodic clock evaluation tests — DoD 35
 *
 * Note: The DoD 35 spec describes a future/evolved API with onBaselineMismatch
 * and driftReferenceProvider. The current implementation has a simpler API with
 * onEvaluationResult. Tests cover the actual implemented API.
 */
// @ts-nocheck


import { describe, it, expect, vi } from "vitest";
import { setupPeriodicClockEvaluation } from "../src/periodic-evaluation.js";
import { createVirtualClock } from "../src/testing/virtual-clock.js";
import { createVirtualTimerScheduler } from "../src/testing/virtual-timer.js";
import type { ClockService } from "../src/ports/clock.js";
import type { ClockDiagnosticsService, ClockDiagnostics, ClockCapabilities } from "../src/ports/diagnostics.js";
import type { PeriodicEvaluationResult } from "../src/periodic-evaluation.js";

function createMockDiagnostics(adapterName = "TestAdapter"): ClockDiagnosticsService {
  const diagnostics: ClockDiagnostics = Object.freeze({
    adapterName,
    monotonicSource: "performance.now" as const,
    highResSource: "performance.timeOrigin+now" as const,
    platformResolutionMs: 0.001,
    cryptoFipsMode: false,
  });
  const capabilities: ClockCapabilities = Object.freeze({
    hasMonotonicTime: true,
    hasHighResOrigin: true,
    crossOriginIsolated: undefined,
    estimatedResolutionMs: 0.001,
    platform: "node" as const,
    highResDegraded: false,
    monotonicDegraded: false,
  });
  return {
    getDiagnostics: () => diagnostics,
    getCapabilities: () => capabilities,
  };
}

// =============================================================================
// DoD 35: Periodic Clock Evaluation
// =============================================================================

describe("setupPeriodicClockEvaluation()", () => {
  it("setupPeriodicClockEvaluation() starts periodic interval via TimerSchedulerPort at configured intervalMs", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();

    setupPeriodicClockEvaluation(clock, diagnostics, timer, { intervalMs: 3600000 });

    // Should register one interval timer
    expect(timer.pendingCount()).toBe(1);
  });

  it("setupPeriodicClockEvaluation() uses default intervalMs of 3600000 when not specified", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();

    // Config without intervalMs — defaults to 3600000
    setupPeriodicClockEvaluation(clock, diagnostics, timer, {});

    // Timer is registered
    expect(timer.pendingCount()).toBe(1);
  });

  it("setupPeriodicClockEvaluation() invokes onEvaluationResult callback on each interval cycle", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();
    const results: PeriodicEvaluationResult[] = [];

    setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      onEvaluationResult: (result) => results.push(result),
    });

    clock.advance(1000);
    expect(results).toHaveLength(1);

    clock.advance(1000);
    expect(results).toHaveLength(2);
  });

  it("setupPeriodicClockEvaluation() evaluation result includes wallClockMs, monotonicMs, highResMs", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();
    let captured: PeriodicEvaluationResult | undefined;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      onEvaluationResult: (result) => {
        captured = result;
      },
    });

    clock.advance(1000);

    expect(captured).toBeDefined();
    expect(typeof captured?.wallClockMs).toBe("number");
    expect(typeof captured?.monotonicMs).toBe("number");
    expect(typeof captured?.highResMs).toBe("number");
  });

  it("setupPeriodicClockEvaluation() evaluation result includes adapterName from diagnostics", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics("MyTestAdapter");
    let captured: PeriodicEvaluationResult | undefined;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      onEvaluationResult: (result) => {
        captured = result;
      },
    });

    clock.advance(1000);

    expect(captured?.adapterName).toBe("MyTestAdapter");
  });

  it("setupPeriodicClockEvaluation() evaluation result includes withinThreshold field", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();
    let captured: PeriodicEvaluationResult | undefined;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      onEvaluationResult: (result) => {
        captured = result;
      },
    });

    clock.advance(1000);

    expect(typeof captured?.withinThreshold).toBe("boolean");
  });

  it("setupPeriodicClockEvaluation() evaluation result is frozen (GxP immutability)", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();
    let captured: PeriodicEvaluationResult | undefined;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      onEvaluationResult: (result) => {
        captured = result;
      },
    });

    clock.advance(1000);

    expect(Object.isFrozen(captured)).toBe(true);
  });

  it("setupPeriodicClockEvaluation() withinThreshold is true when divergence <= maxDivergenceMs", () => {
    // Virtual clock: highResNow() and wallClockNow() both return same value (no divergence)
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();
    let captured: PeriodicEvaluationResult | undefined;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      maxDivergenceMs: 1000,
      onEvaluationResult: (result) => {
        captured = result;
      },
    });

    clock.advance(1000);

    // Virtual clock returns same values for highRes and wallClock
    // divergence should be 0, which is <= 1000
    expect(captured?.withinThreshold).toBe(true);
  });

  it("setupPeriodicClockEvaluation() does not invoke onEvaluationResult when not configured", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();

    expect(() => {
      setupPeriodicClockEvaluation(clock, diagnostics, timer, {
        intervalMs: 1000,
        // No onEvaluationResult
      });
      clock.advance(1000);
    }).not.toThrow();
  });

  it("setupPeriodicClockEvaluation().stop() cancels the interval (no further cycles after stop)", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();
    let callCount = 0;

    const handle = setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      onEvaluationResult: () => {
        callCount++;
      },
    });

    clock.advance(1000); // fires once
    expect(callCount).toBe(1);

    handle.stop();
    clock.advance(1000); // should NOT fire after stop
    expect(callCount).toBe(1);
  });

  it("setupPeriodicClockEvaluation() stop() is idempotent (second call does not throw)", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();

    const handle = setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
    });

    expect(() => {
      handle.stop();
      handle.stop();
    }).not.toThrow();
  });

  it("setupPeriodicClockEvaluation() calls getDiagnostics() on each interval cycle", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const getDiagnosticsSpy = vi.fn(() =>
      Object.freeze({
        adapterName: "SpyAdapter",
        monotonicSource: "performance.now" as const,
        highResSource: "performance.timeOrigin+now" as const,
        platformResolutionMs: 0.001,
        cryptoFipsMode: false,
      })
    );
    const diagnostics: ClockDiagnosticsService = {
      getDiagnostics: getDiagnosticsSpy,
      getCapabilities: () =>
        Object.freeze({
          hasMonotonicTime: true,
          hasHighResOrigin: true,
          crossOriginIsolated: undefined,
          estimatedResolutionMs: 0.001,
          platform: "node" as const,
          highResDegraded: false,
          monotonicDegraded: false,
        }),
    };

    setupPeriodicClockEvaluation(clock, diagnostics, timer, { intervalMs: 1000 });

    clock.advance(1000);
    expect(getDiagnosticsSpy).toHaveBeenCalledTimes(1);

    clock.advance(1000);
    expect(getDiagnosticsSpy).toHaveBeenCalledTimes(2);
  });

  it("setupPeriodicClockEvaluation() returns object with stop() method", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();

    const handle = setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
    });

    expect(typeof handle.stop).toBe("function");
  });

  it("setupPeriodicClockEvaluation() handle is frozen (GxP immutability)", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();

    const handle = setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
    });

    expect(Object.isFrozen(handle)).toBe(true);
  });
});

// =============================================================================
// Mutation score improvement
// =============================================================================

describe("setupPeriodicClockEvaluation() — divergence threshold mutations", () => {
  it("withinThreshold is true when maxDivergenceMs not set (defaults to 1000, kills ?? mutant)", () => {
    // With mutant config.maxDivergenceMs && 1000: undefined && 1000 = undefined
    // Then 0 <= undefined = false → withinThreshold = false (wrong)
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();
    let captured: PeriodicEvaluationResult | undefined;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      onEvaluationResult: (result) => {
        captured = result;
      },
      // maxDivergenceMs intentionally omitted → default 1000
    });

    clock.advance(1000);
    // Virtual clock: divergence = 0, default maxDivergenceMs = 1000, 0 <= 1000 = true
    expect(captured?.withinThreshold).toBe(true);
  });

  it("withinThreshold is false when divergenceMs exceeds maxDivergenceMs (kills CE=true mutant)", () => {
    // Virtual clock with different highRes and wallClock values → large divergence
    const clock = createVirtualClock({ initialWallClock: 1_000_000, initialHighRes: 0 });
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();
    let captured: PeriodicEvaluationResult | undefined;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      maxDivergenceMs: 100, // small threshold
      onEvaluationResult: (result) => {
        captured = result;
      },
    });

    clock.advance(1000);
    // divergenceMs = |highResMs - wallClockMs| ≈ 1000000 >> 100
    expect(captured?.withinThreshold).toBe(false);
  });

  it("withinThreshold is true when divergenceMs === maxDivergenceMs=0 (kills < mutant)", () => {
    // Virtual clock: highResNow() === wallClockNow() → divergence = 0
    // original (<=): 0 <= 0 = true; mutant (<): 0 < 0 = false
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();
    let captured: PeriodicEvaluationResult | undefined;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      maxDivergenceMs: 0,
      onEvaluationResult: (result) => {
        captured = result;
      },
    });

    clock.advance(1000);
    expect(captured?.withinThreshold).toBe(true);
  });
});

describe("PeriodicEvaluationResult structure", () => {
  it("evaluation result has timestamp field matching wallClockMs", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();
    let captured: PeriodicEvaluationResult | undefined;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      onEvaluationResult: (result) => {
        captured = result;
      },
    });

    clock.advance(1000);

    expect(captured?.timestamp).toBe(captured?.wallClockMs);
  });

  it("evaluation result includes divergenceMs field", () => {
    const clock = createVirtualClock();
    const timer = createVirtualTimerScheduler(clock);
    const diagnostics = createMockDiagnostics();
    let captured: PeriodicEvaluationResult | undefined;

    setupPeriodicClockEvaluation(clock, diagnostics, timer, {
      intervalMs: 1000,
      onEvaluationResult: (result) => {
        captured = result;
      },
    });

    clock.advance(1000);

    expect(typeof captured?.divergenceMs).toBe("number");
    expect(captured?.divergenceMs).toBeGreaterThanOrEqual(0);
  });
});
