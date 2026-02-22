/**
 * Periodic clock evaluation for EU GMP Annex 11 Section 11 compliance.
 *
 * @packageDocumentation
 */

import type { ClockService } from "./ports/clock.js";
import type {
  ClockDiagnostics,
  ClockCapabilities,
  ClockDiagnosticsService,
} from "./ports/diagnostics.js";
import type { TimerSchedulerService, TimerHandle } from "./ports/timer-scheduler.js";

/** Configuration for periodic clock evaluation. */
export interface PeriodicEvaluationConfig {
  /** Interval in milliseconds between evaluations. */
  readonly intervalMs: number;
  /** Baseline ClockDiagnostics snapshot to compare against on each cycle. */
  readonly baselineDiagnostics: ClockDiagnostics;
  /** Baseline ClockCapabilities snapshot to compare against on each cycle. */
  readonly baselineCapabilities: ClockCapabilities;
  /**
   * Called when a field in diagnostics or capabilities deviates from baseline.
   * Receives the field name, expected (baseline) value, and actual current value.
   */
  readonly onBaselineMismatch: (field: string, expected: unknown, actual: unknown) => void;
  /**
   * Called when measured drift from the reference provider exceeds driftThresholdMs.
   * Receives the observed drift in ms and the current wall-clock timestamp.
   */
  readonly onDriftDetected: (drift: number, wallClockMs: number) => void;
  /**
   * Returns a reference wall-clock time (in ms) for drift measurement.
   * When absent, drift detection is skipped entirely.
   */
  readonly driftReferenceProvider?: () => number;
  /** Maximum acceptable drift in milliseconds. Default: 1000. */
  readonly driftThresholdMs?: number;
}

// Explicit key lists avoid type casts while keeping the comparison type-safe.
const DIAGNOSTICS_FIELDS: ReadonlyArray<keyof ClockDiagnostics> = [
  "adapterName",
  "monotonicSource",
  "highResSource",
  "platformResolutionMs",
  "cryptoFipsMode",
];

const CAPABILITIES_FIELDS: ReadonlyArray<keyof ClockCapabilities> = [
  "hasMonotonicTime",
  "hasHighResOrigin",
  "crossOriginIsolated",
  "estimatedResolutionMs",
  "platform",
  "highResDegraded",
  "monotonicDegraded",
];

/**
 * Sets up periodic clock evaluation for ongoing compliance monitoring.
 * Returns a handle with a stop() method to cancel the evaluation.
 *
 * EU GMP Annex 11 Section 11: periodic evaluation of computerized system validity.
 */
export function setupPeriodicClockEvaluation(
  clock: ClockService,
  diagnostics: ClockDiagnosticsService,
  timer: TimerSchedulerService,
  config: PeriodicEvaluationConfig
): { readonly stop: () => void } {
  const driftThresholdMs = config.driftThresholdMs ?? 1000;

  const evaluate = (): void => {
    const wallClockMs = clock.wallClockNow();

    // Compare diagnostics against baseline — report any deviating field
    const currentDiag = diagnostics.getDiagnostics();
    for (const field of DIAGNOSTICS_FIELDS) {
      if (currentDiag[field] !== config.baselineDiagnostics[field]) {
        config.onBaselineMismatch(field, config.baselineDiagnostics[field], currentDiag[field]);
      }
    }

    // Compare capabilities against baseline — report any deviating field
    const currentCaps = diagnostics.getCapabilities();
    for (const field of CAPABILITIES_FIELDS) {
      if (currentCaps[field] !== config.baselineCapabilities[field]) {
        config.onBaselineMismatch(
          field,
          config.baselineCapabilities[field],
          currentCaps[field]
        );
      }
    }

    // Drift detection: only when a reference provider is configured
    if (config.driftReferenceProvider !== undefined) {
      const reference = config.driftReferenceProvider();
      const drift = Math.abs(reference - wallClockMs);
      if (drift > driftThresholdMs) {
        config.onDriftDetected(drift, wallClockMs);
      }
    }
  };

  const intervalResult = timer.setInterval(evaluate, config.intervalMs);
  let handle: TimerHandle | undefined = intervalResult.isOk() ? intervalResult.value : undefined;

  return Object.freeze({
    stop(): void {
      // Stryker disable next-line ConditionalExpression -- EQUIVALENT: handle is a TimerHandle object (truthy) or undefined (falsy); !== undefined and truthy-check produce identical boolean
      if (handle !== undefined) {
        timer.clearInterval(handle);
        handle = undefined;
      }
    },
  });
}
