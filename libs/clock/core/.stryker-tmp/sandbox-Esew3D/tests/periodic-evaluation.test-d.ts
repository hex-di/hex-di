/**
 * Periodic clock evaluation type-level tests — DoD 35
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import { setupPeriodicClockEvaluation } from "../src/periodic-evaluation.js";
import type {
  PeriodicEvaluationConfig,
  PeriodicEvaluationResult,
} from "../src/periodic-evaluation.js";
import type { ClockService } from "../src/ports/clock.js";
import type { ClockDiagnosticsService } from "../src/ports/diagnostics.js";
import type { TimerSchedulerService } from "../src/ports/timer-scheduler.js";

// =============================================================================
// DoD 35: Periodic Clock Evaluation — type-level
// =============================================================================

describe("setupPeriodicClockEvaluation type signature", () => {
  it("setupPeriodicClockEvaluation accepts ClockService as first parameter", () => {
    expectTypeOf(setupPeriodicClockEvaluation).parameter(0).toMatchTypeOf<ClockService>();
  });

  it("setupPeriodicClockEvaluation accepts ClockDiagnosticsService as second parameter", () => {
    expectTypeOf(setupPeriodicClockEvaluation)
      .parameter(1)
      .toMatchTypeOf<ClockDiagnosticsService>();
  });

  it("setupPeriodicClockEvaluation accepts TimerSchedulerService as third parameter", () => {
    expectTypeOf(setupPeriodicClockEvaluation)
      .parameter(2)
      .toMatchTypeOf<TimerSchedulerService>();
  });

  it("setupPeriodicClockEvaluation accepts PeriodicEvaluationConfig as fourth parameter", () => {
    expectTypeOf(setupPeriodicClockEvaluation)
      .parameter(3)
      .toMatchTypeOf<PeriodicEvaluationConfig>();
  });

  it("setupPeriodicClockEvaluation returns { readonly stop: () => void }", () => {
    expectTypeOf(setupPeriodicClockEvaluation).returns.toHaveProperty("stop");
    expectTypeOf(setupPeriodicClockEvaluation).returns.toMatchTypeOf<{
      readonly stop: () => void;
    }>();
  });
});

describe("PeriodicEvaluationConfig type structure", () => {
  it("PeriodicEvaluationConfig has optional intervalMs", () => {
    const config: PeriodicEvaluationConfig = {};
    expectTypeOf(config).toHaveProperty("intervalMs").toMatchTypeOf<number | undefined>();
  });

  it("PeriodicEvaluationConfig has optional maxDivergenceMs", () => {
    const config: PeriodicEvaluationConfig = {};
    expectTypeOf(config).toHaveProperty("maxDivergenceMs").toMatchTypeOf<number | undefined>();
  });

  it("PeriodicEvaluationConfig has optional onEvaluationResult callback", () => {
    const config: PeriodicEvaluationConfig = {};
    expectTypeOf(config)
      .toHaveProperty("onEvaluationResult")
      .toMatchTypeOf<((result: PeriodicEvaluationResult) => void) | undefined>();
  });
});

describe("PeriodicEvaluationResult type structure", () => {
  it("PeriodicEvaluationResult has readonly timestamp field of type number", () => {
    expectTypeOf<PeriodicEvaluationResult>().toHaveProperty("timestamp").toEqualTypeOf<number>();
  });

  it("PeriodicEvaluationResult has readonly wallClockMs field of type number", () => {
    expectTypeOf<PeriodicEvaluationResult>()
      .toHaveProperty("wallClockMs")
      .toEqualTypeOf<number>();
  });

  it("PeriodicEvaluationResult has readonly monotonicMs field of type number", () => {
    expectTypeOf<PeriodicEvaluationResult>()
      .toHaveProperty("monotonicMs")
      .toEqualTypeOf<number>();
  });

  it("PeriodicEvaluationResult has readonly highResMs field of type number", () => {
    expectTypeOf<PeriodicEvaluationResult>().toHaveProperty("highResMs").toEqualTypeOf<number>();
  });

  it("PeriodicEvaluationResult has readonly divergenceMs field of type number", () => {
    expectTypeOf<PeriodicEvaluationResult>()
      .toHaveProperty("divergenceMs")
      .toEqualTypeOf<number>();
  });

  it("PeriodicEvaluationResult has readonly adapterName field of type string", () => {
    expectTypeOf<PeriodicEvaluationResult>()
      .toHaveProperty("adapterName")
      .toEqualTypeOf<string>();
  });

  it("PeriodicEvaluationResult has readonly withinThreshold field of type boolean", () => {
    expectTypeOf<PeriodicEvaluationResult>()
      .toHaveProperty("withinThreshold")
      .toEqualTypeOf<boolean>();
  });
});
