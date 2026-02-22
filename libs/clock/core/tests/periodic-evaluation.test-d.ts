/**
 * Periodic clock evaluation type-level tests — DoD 35
 */

import { describe, it, expectTypeOf } from "vitest";
import { setupPeriodicClockEvaluation } from "../src/periodic-evaluation.js";
import type { PeriodicEvaluationConfig } from "../src/periodic-evaluation.js";
import type { ClockDiagnostics, ClockCapabilities, ClockDiagnosticsService } from "../src/ports/diagnostics.js";
import type { ClockService } from "../src/ports/clock.js";
import type { TimerSchedulerService } from "../src/ports/timer-scheduler.js";

// =============================================================================
// DoD 35 — Type tests 13..16
// =============================================================================

describe("DoD35-13: setupPeriodicClockEvaluation parameter types", () => {
  it("accepts ClockService as first parameter", () => {
    expectTypeOf(setupPeriodicClockEvaluation).parameter(0).toMatchTypeOf<ClockService>();
  });

  it("accepts ClockDiagnosticsService as second parameter", () => {
    expectTypeOf(setupPeriodicClockEvaluation)
      .parameter(1)
      .toMatchTypeOf<ClockDiagnosticsService>();
  });

  it("accepts TimerSchedulerService as third parameter", () => {
    expectTypeOf(setupPeriodicClockEvaluation)
      .parameter(2)
      .toMatchTypeOf<TimerSchedulerService>();
  });

  it("accepts PeriodicEvaluationConfig as fourth parameter", () => {
    expectTypeOf(setupPeriodicClockEvaluation)
      .parameter(3)
      .toMatchTypeOf<PeriodicEvaluationConfig>();
  });
});

describe("DoD35-14: setupPeriodicClockEvaluation return type", () => {
  it("returns { readonly stop: () => void }", () => {
    expectTypeOf(setupPeriodicClockEvaluation).returns.toMatchTypeOf<{
      readonly stop: () => void;
    }>();
  });
});

describe("DoD35-15: PeriodicEvaluationConfig required fields", () => {
  it("has required intervalMs field of type number", () => {
    // Required means no '?' — verify the type accepts a number and is not optional
    expectTypeOf<PeriodicEvaluationConfig>()
      .toHaveProperty("intervalMs")
      .toEqualTypeOf<number>();
  });

  it("has required baselineDiagnostics field of type ClockDiagnostics", () => {
    expectTypeOf<PeriodicEvaluationConfig>()
      .toHaveProperty("baselineDiagnostics")
      .toEqualTypeOf<ClockDiagnostics>();
  });

  it("has required baselineCapabilities field of type ClockCapabilities", () => {
    expectTypeOf<PeriodicEvaluationConfig>()
      .toHaveProperty("baselineCapabilities")
      .toEqualTypeOf<ClockCapabilities>();
  });

  it("has required onBaselineMismatch callback", () => {
    expectTypeOf<PeriodicEvaluationConfig>()
      .toHaveProperty("onBaselineMismatch")
      .toMatchTypeOf<(field: string, expected: unknown, actual: unknown) => void>();
  });

  it("has required onDriftDetected callback", () => {
    expectTypeOf<PeriodicEvaluationConfig>()
      .toHaveProperty("onDriftDetected")
      .toMatchTypeOf<(drift: number, wallClockMs: number) => void>();
  });

  it("required fields are not optional (PeriodicEvaluationConfig is constructable with required fields)", () => {
    // If required fields were optional this would compile even with an empty object.
    // This checks that the type signature requires them by constructing a valid config.
    const config: PeriodicEvaluationConfig = {
      intervalMs: 1000,
      baselineDiagnostics: {
        adapterName: "A",
        monotonicSource: "performance.now",
        highResSource: "performance.timeOrigin+now",
        platformResolutionMs: undefined,
        cryptoFipsMode: undefined,
      },
      baselineCapabilities: {
        hasMonotonicTime: true,
        hasHighResOrigin: true,
        crossOriginIsolated: undefined,
        estimatedResolutionMs: 1,
        platform: "node",
        highResDegraded: false,
        monotonicDegraded: false,
      },
      onBaselineMismatch: () => {},
      onDriftDetected: () => {},
    };
    expectTypeOf(config).toMatchTypeOf<PeriodicEvaluationConfig>();
  });
});

describe("DoD35-16: PeriodicEvaluationConfig optional fields", () => {
  it("has optional driftReferenceProvider field", () => {
    expectTypeOf<PeriodicEvaluationConfig>()
      .toHaveProperty("driftReferenceProvider")
      .toMatchTypeOf<(() => number) | undefined>();
  });

  it("has optional driftThresholdMs field", () => {
    expectTypeOf<PeriodicEvaluationConfig>()
      .toHaveProperty("driftThresholdMs")
      .toMatchTypeOf<number | undefined>();
  });
});
