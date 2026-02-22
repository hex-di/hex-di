/**
 * Periodic clock evaluation for EU GMP Annex 11 Section 11 compliance.
 *
 * @packageDocumentation
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { ClockService } from "./ports/clock.js";
import type { ClockDiagnosticsService } from "./ports/diagnostics.js";
import type { TimerSchedulerService, TimerHandle } from "./ports/timer-scheduler.js";

/** Configuration for periodic clock evaluation. */
export interface PeriodicEvaluationConfig {
  /** Interval in milliseconds between evaluations. Default: 3600000 (1 hour). */
  readonly intervalMs?: number;
  /** Maximum acceptable divergence between highResNow() and wallClockNow() in milliseconds. */
  readonly maxDivergenceMs?: number;
  /** Called when evaluation detects a potential issue. */
  readonly onEvaluationResult?: (result: PeriodicEvaluationResult) => void;
}

/** Result of a single periodic clock evaluation. */
export interface PeriodicEvaluationResult {
  readonly timestamp: number;
  readonly wallClockMs: number;
  readonly monotonicMs: number;
  readonly highResMs: number;
  readonly divergenceMs: number;
  readonly adapterName: string;
  readonly withinThreshold: boolean;
}

/**
 * Sets up periodic clock evaluation for ongoing compliance monitoring.
 * Returns a handle with a stop() method to cancel the evaluation.
 *
 * EU GMP Annex 11 Section 11: periodic evaluation of computerized system validity.
 */
export function setupPeriodicClockEvaluation(clock: ClockService, diagnostics: ClockDiagnosticsService, timer: TimerSchedulerService, config: PeriodicEvaluationConfig): {
  readonly stop: () => void;
} {
  if (stryMutAct_9fa48("836")) {
    {}
  } else {
    stryCov_9fa48("836");
    const intervalMs = stryMutAct_9fa48("837") ? config.intervalMs && 3600000 : (stryCov_9fa48("837"), config.intervalMs ?? 3600000);
    const maxDivergenceMs = stryMutAct_9fa48("838") ? config.maxDivergenceMs && 1000 : (stryCov_9fa48("838"), config.maxDivergenceMs ?? 1000);
    const evaluate = (): void => {
      if (stryMutAct_9fa48("839")) {
        {}
      } else {
        stryCov_9fa48("839");
        const wallClockMs = clock.wallClockNow();
        const monotonicMs = clock.monotonicNow();
        const highResMs = clock.highResNow();
        const divergenceMs = Math.abs(stryMutAct_9fa48("840") ? highResMs + wallClockMs : (stryCov_9fa48("840"), highResMs - wallClockMs));
        const adapterName = diagnostics.getDiagnostics().adapterName;
        const result: PeriodicEvaluationResult = Object.freeze(stryMutAct_9fa48("841") ? {} : (stryCov_9fa48("841"), {
          timestamp: wallClockMs,
          wallClockMs,
          monotonicMs,
          highResMs,
          divergenceMs,
          adapterName,
          withinThreshold: stryMutAct_9fa48("845") ? divergenceMs > maxDivergenceMs : stryMutAct_9fa48("844") ? divergenceMs < maxDivergenceMs : stryMutAct_9fa48("843") ? false : stryMutAct_9fa48("842") ? true : (stryCov_9fa48("842", "843", "844", "845"), divergenceMs <= maxDivergenceMs)
        }));
        stryMutAct_9fa48("846") ? config.onEvaluationResult(result) : (stryCov_9fa48("846"), config.onEvaluationResult?.(result));
      }
    };
    let handle: TimerHandle | undefined = timer.setInterval(evaluate, intervalMs);
    return Object.freeze(stryMutAct_9fa48("847") ? {} : (stryCov_9fa48("847"), {
      stop(): void {
        if (stryMutAct_9fa48("848")) {
          {}
        } else {
          stryCov_9fa48("848");
          if (stryMutAct_9fa48("851") ? handle === undefined : stryMutAct_9fa48("850") ? false : stryMutAct_9fa48("849") ? true : (stryCov_9fa48("849", "850", "851"), handle !== undefined)) {
            if (stryMutAct_9fa48("852")) {
              {}
            } else {
              stryCov_9fa48("852");
              timer.clearInterval(handle);
              handle = undefined;
            }
          }
        }
      }
    }));
  }
}