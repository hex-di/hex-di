/**
 * EdgeRuntimeClockAdapter — clock adapter for V8 isolate edge runtimes.
 *
 * Handles the common edge runtime limitation: performance.now() available
 * but performance.timeOrigin unavailable.
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
import { createAdapter } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { asMonotonic, asWallClock, asHighRes } from "../branded.js";
import { ClockPort } from "../ports/clock.js";
import type { ClockService } from "../ports/clock.js";
import type { ClockDiagnosticsService, ClockDiagnostics, ClockCapabilities } from "../ports/diagnostics.js";
import { createClockStartupError, getPerformance, createClampedFallback } from "./system-clock.js";
import type { ClockStartupError } from "./system-clock.js";

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
export function createEdgeRuntimeClock(options?: EdgeRuntimeClockOptions): Result<ClockService & ClockDiagnosticsService, ClockStartupError> {
  if (stryMutAct_9fa48("34")) {
    {}
  } else {
    stryCov_9fa48("34");
    // Capture platform APIs at construction (same anti-tampering as SystemClockAdapter)
    const perf = getPerformance();
    const capturedDateNow = Date.now.bind(Date);
    const clampedFallback = perf ? undefined : createClampedFallback(capturedDateNow);
    const monotonicNowRaw: () => number = perf ? stryMutAct_9fa48("35") ? () => undefined : (stryCov_9fa48("35"), () => perf.now()) : clampedFallback as () => number;
    const wallClockNowRaw: () => number = stryMutAct_9fa48("36") ? () => undefined : (stryCov_9fa48("36"), (() => {
      const wallClockNowRaw: () => number = () => capturedDateNow();
      return wallClockNowRaw;
    })());

    // Edge runtimes: highRes degrades to Date.now() (no timeOrigin)
    const highResNowRaw: () => number = stryMutAct_9fa48("37") ? () => undefined : (stryCov_9fa48("37"), (() => {
      const highResNowRaw: () => number = () => capturedDateNow();
      return highResNowRaw;
    })());

    // ST-1: Monotonic non-negativity
    const m1 = monotonicNowRaw();
    if (stryMutAct_9fa48("41") ? m1 >= 0 : stryMutAct_9fa48("40") ? m1 <= 0 : stryMutAct_9fa48("39") ? false : stryMutAct_9fa48("38") ? true : (stryCov_9fa48("38", "39", "40", "41"), m1 < 0)) {
      if (stryMutAct_9fa48("42")) {
        {}
      } else {
        stryCov_9fa48("42");
        return err(createClockStartupError(stryMutAct_9fa48("43") ? "" : (stryCov_9fa48("43"), "ST-1"), m1, stryMutAct_9fa48("44") ? "" : (stryCov_9fa48("44"), "monotonicNow() returned negative value")));
      }
    }

    // ST-2: Wall-clock plausibility
    const wall = wallClockNowRaw();
    if (stryMutAct_9fa48("48") ? wall > 1577836800000 : stryMutAct_9fa48("47") ? wall < 1577836800000 : stryMutAct_9fa48("46") ? false : stryMutAct_9fa48("45") ? true : (stryCov_9fa48("45", "46", "47", "48"), wall <= 1577836800000)) {
      if (stryMutAct_9fa48("49")) {
        {}
      } else {
        stryCov_9fa48("49");
        return err(createClockStartupError(stryMutAct_9fa48("50") ? "" : (stryCov_9fa48("50"), "ST-2"), wall, stryMutAct_9fa48("51") ? "" : (stryCov_9fa48("51"), "wallClockNow() returned implausible epoch value (before 2020-01-01)")));
      }
    }

    // ST-3: Monotonic non-regression
    const m2 = monotonicNowRaw();
    if (stryMutAct_9fa48("55") ? m2 >= m1 : stryMutAct_9fa48("54") ? m2 <= m1 : stryMutAct_9fa48("53") ? false : stryMutAct_9fa48("52") ? true : (stryCov_9fa48("52", "53", "54", "55"), m2 < m1)) {
      if (stryMutAct_9fa48("56")) {
        {}
      } else {
        stryCov_9fa48("56");
        return err(createClockStartupError(stryMutAct_9fa48("57") ? "" : (stryCov_9fa48("57"), "ST-3"), m2, stryMutAct_9fa48("58") ? `` : (stryCov_9fa48("58"), `monotonicNow() regressed from ${m1} to ${m2}`)));
      }
    }

    // ST-4: Platform API freeze verification (GxP mode only)
    if (stryMutAct_9fa48("61") ? options?.gxp !== true : stryMutAct_9fa48("60") ? false : stryMutAct_9fa48("59") ? true : (stryCov_9fa48("59", "60", "61"), (stryMutAct_9fa48("62") ? options.gxp : (stryCov_9fa48("62"), options?.gxp)) === (stryMutAct_9fa48("63") ? false : (stryCov_9fa48("63"), true)))) {
      if (stryMutAct_9fa48("64")) {
        {}
      } else {
        stryCov_9fa48("64");
        if (stryMutAct_9fa48("67") ? false : stryMutAct_9fa48("66") ? true : stryMutAct_9fa48("65") ? Object.isFrozen(Date) : (stryCov_9fa48("65", "66", "67"), !Object.isFrozen(Date))) {
          if (stryMutAct_9fa48("68")) {
            {}
          } else {
            stryCov_9fa48("68");
            return err(createClockStartupError(stryMutAct_9fa48("69") ? "" : (stryCov_9fa48("69"), "ST-4"), 0, stryMutAct_9fa48("70") ? "" : (stryCov_9fa48("70"), "Date object is not frozen. GxP deployments MUST freeze Date at application entry point.")));
          }
        }
        if (stryMutAct_9fa48("73") ? perf !== undefined || !Object.isFrozen(globalThis.performance) : stryMutAct_9fa48("72") ? false : stryMutAct_9fa48("71") ? true : (stryCov_9fa48("71", "72", "73"), (stryMutAct_9fa48("75") ? perf === undefined : stryMutAct_9fa48("74") ? true : (stryCov_9fa48("74", "75"), perf !== undefined)) && (stryMutAct_9fa48("76") ? Object.isFrozen(globalThis.performance) : (stryCov_9fa48("76"), !Object.isFrozen(globalThis.performance))))) {
          if (stryMutAct_9fa48("77")) {
            {}
          } else {
            stryCov_9fa48("77");
            return err(createClockStartupError(stryMutAct_9fa48("78") ? "" : (stryCov_9fa48("78"), "ST-4"), 0, stryMutAct_9fa48("79") ? "" : (stryCov_9fa48("79"), "performance object is not frozen. GxP deployments MUST freeze performance at application entry point.")));
          }
        }
      }
    }

    // ST-5 is skipped: highResNow === wallClockNow by design — divergence always 0

    const capabilities: ClockCapabilities = Object.freeze(stryMutAct_9fa48("80") ? {} : (stryCov_9fa48("80"), {
      hasMonotonicTime: stryMutAct_9fa48("83") ? perf === undefined : stryMutAct_9fa48("82") ? false : stryMutAct_9fa48("81") ? true : (stryCov_9fa48("81", "82", "83"), perf !== undefined),
      hasHighResOrigin: stryMutAct_9fa48("84") ? true : (stryCov_9fa48("84"), false),
      crossOriginIsolated: undefined,
      estimatedResolutionMs: 1.0,
      platform: "edge-worker" as const,
      highResDegraded: stryMutAct_9fa48("85") ? false : (stryCov_9fa48("85"), true),
      monotonicDegraded: stryMutAct_9fa48("88") ? perf !== undefined : stryMutAct_9fa48("87") ? false : stryMutAct_9fa48("86") ? true : (stryCov_9fa48("86", "87", "88"), perf === undefined)
    }));
    const diagnostics: ClockDiagnostics = Object.freeze(stryMutAct_9fa48("89") ? {} : (stryCov_9fa48("89"), {
      adapterName: stryMutAct_9fa48("90") ? "" : (stryCov_9fa48("90"), "EdgeRuntimeClockAdapter"),
      monotonicSource: perf ? stryMutAct_9fa48("91") ? "" : (stryCov_9fa48("91"), "performance.now") : stryMutAct_9fa48("92") ? "" : (stryCov_9fa48("92"), "Date.now-clamped"),
      highResSource: stryMutAct_9fa48("93") ? "" : (stryCov_9fa48("93"), "Date.now"),
      platformResolutionMs: 1.0,
      cryptoFipsMode: undefined
    }));
    const adapter = Object.freeze(stryMutAct_9fa48("94") ? {} : (stryCov_9fa48("94"), {
      monotonicNow: stryMutAct_9fa48("95") ? () => undefined : (stryCov_9fa48("95"), () => asMonotonic(monotonicNowRaw())),
      wallClockNow: stryMutAct_9fa48("96") ? () => undefined : (stryCov_9fa48("96"), () => asWallClock(wallClockNowRaw())),
      highResNow: stryMutAct_9fa48("97") ? () => undefined : (stryCov_9fa48("97"), () => asHighRes(highResNowRaw())),
      getDiagnostics: stryMutAct_9fa48("98") ? () => undefined : (stryCov_9fa48("98"), () => diagnostics),
      getCapabilities: stryMutAct_9fa48("99") ? () => undefined : (stryCov_9fa48("99"), () => capabilities)
    }));
    return ok(adapter);
  }
}

/** Pre-wired singleton EdgeRuntimeClockAdapter. */
export const EdgeRuntimeClockAdapter = createAdapter(stryMutAct_9fa48("100") ? {} : (stryCov_9fa48("100"), {
  provides: ClockPort,
  requires: stryMutAct_9fa48("101") ? ["Stryker was here"] : (stryCov_9fa48("101"), []),
  lifetime: stryMutAct_9fa48("102") ? "" : (stryCov_9fa48("102"), "singleton"),
  factory: () => {
    if (stryMutAct_9fa48("103")) {
      {}
    } else {
      stryCov_9fa48("103");
      const result = createEdgeRuntimeClock();
      if (stryMutAct_9fa48("105") ? false : stryMutAct_9fa48("104") ? true : (stryCov_9fa48("104", "105"), result.isErr())) {
        if (stryMutAct_9fa48("106")) {
          {}
        } else {
          stryCov_9fa48("106");
          throw new Error(stryMutAct_9fa48("107") ? `` : (stryCov_9fa48("107"), `EdgeRuntimeClockAdapter startup failed (${result.error.check}): ${result.error.message}`));
        }
      }
      return result.value;
    }
  }
}));

/** Factory returning a configured EdgeRuntimeClockAdapter with options. */
export function createEdgeRuntimeClockAdapter(options?: EdgeRuntimeClockOptions) {
  if (stryMutAct_9fa48("108")) {
    {}
  } else {
    stryCov_9fa48("108");
    return createAdapter(stryMutAct_9fa48("109") ? {} : (stryCov_9fa48("109"), {
      provides: ClockPort,
      requires: stryMutAct_9fa48("110") ? ["Stryker was here"] : (stryCov_9fa48("110"), []),
      lifetime: stryMutAct_9fa48("111") ? "" : (stryCov_9fa48("111"), "singleton"),
      factory: () => {
        if (stryMutAct_9fa48("112")) {
          {}
        } else {
          stryCov_9fa48("112");
          const result = createEdgeRuntimeClock(options);
          if (stryMutAct_9fa48("114") ? false : stryMutAct_9fa48("113") ? true : (stryCov_9fa48("113", "114"), result.isErr())) {
            if (stryMutAct_9fa48("115")) {
              {}
            } else {
              stryCov_9fa48("115");
              throw new Error(stryMutAct_9fa48("116") ? `` : (stryCov_9fa48("116"), `EdgeRuntimeClockAdapter startup failed (${result.error.check}): ${result.error.message}`));
            }
          }
          return result.value;
        }
      }
    }));
  }
}