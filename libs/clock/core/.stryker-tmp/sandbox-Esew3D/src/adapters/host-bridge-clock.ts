/**
 * HostBridgeClockAdapter — clock adapter for React Native, WASM, and embedded environments.
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
import { createClockStartupError } from "./system-clock.js";
import type { ClockStartupError } from "./system-clock.js";

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
export function createHostBridgeClock(bridge: HostClockBridge, options: HostBridgeClockOptions): Result<ClockService & ClockDiagnosticsService, ClockStartupError> {
  if (stryMutAct_9fa48("117")) {
    {}
  } else {
    stryCov_9fa48("117");
    // CLK-HB-003: Validate bridge functions at construction time
    if (stryMutAct_9fa48("120") ? typeof bridge.monotonicNowMs === "function" : stryMutAct_9fa48("119") ? false : stryMutAct_9fa48("118") ? true : (stryCov_9fa48("118", "119", "120"), typeof bridge.monotonicNowMs !== (stryMutAct_9fa48("121") ? "" : (stryCov_9fa48("121"), "function")))) {
      if (stryMutAct_9fa48("122")) {
        {}
      } else {
        stryCov_9fa48("122");
        throw new TypeError(stryMutAct_9fa48("123") ? "" : (stryCov_9fa48("123"), "bridge.monotonicNowMs must be a function"));
      }
    }
    if (stryMutAct_9fa48("126") ? typeof bridge.wallClockNowMs === "function" : stryMutAct_9fa48("125") ? false : stryMutAct_9fa48("124") ? true : (stryCov_9fa48("124", "125", "126"), typeof bridge.wallClockNowMs !== (stryMutAct_9fa48("127") ? "" : (stryCov_9fa48("127"), "function")))) {
      if (stryMutAct_9fa48("128")) {
        {}
      } else {
        stryCov_9fa48("128");
        throw new TypeError(stryMutAct_9fa48("129") ? "" : (stryCov_9fa48("129"), "bridge.wallClockNowMs must be a function"));
      }
    }

    // HB-5: Capture bridge function references at construction time
    const capturedMonotonic = bridge.monotonicNowMs;
    const capturedWallClock = bridge.wallClockNowMs;
    const capturedHighRes = stryMutAct_9fa48("130") ? bridge.highResNowMs && bridge.wallClockNowMs : (stryCov_9fa48("130"), bridge.highResNowMs ?? bridge.wallClockNowMs);
    const hasHighRes = stryMutAct_9fa48("133") ? bridge.highResNowMs === undefined : stryMutAct_9fa48("132") ? false : stryMutAct_9fa48("131") ? true : (stryCov_9fa48("131", "132", "133"), bridge.highResNowMs !== undefined);
    const monotonicNowRaw: () => number = stryMutAct_9fa48("134") ? () => undefined : (stryCov_9fa48("134"), (() => {
      const monotonicNowRaw: () => number = () => capturedMonotonic();
      return monotonicNowRaw;
    })());
    const wallClockNowRaw: () => number = stryMutAct_9fa48("135") ? () => undefined : (stryCov_9fa48("135"), (() => {
      const wallClockNowRaw: () => number = () => capturedWallClock();
      return wallClockNowRaw;
    })());
    const highResNowRaw: () => number = stryMutAct_9fa48("136") ? () => undefined : (stryCov_9fa48("136"), (() => {
      const highResNowRaw: () => number = () => capturedHighRes();
      return highResNowRaw;
    })());

    // ST-1: Monotonic non-negativity
    const m1 = monotonicNowRaw();
    if (stryMutAct_9fa48("140") ? m1 >= 0 : stryMutAct_9fa48("139") ? m1 <= 0 : stryMutAct_9fa48("138") ? false : stryMutAct_9fa48("137") ? true : (stryCov_9fa48("137", "138", "139", "140"), m1 < 0)) {
      if (stryMutAct_9fa48("141")) {
        {}
      } else {
        stryCov_9fa48("141");
        return err(createClockStartupError(stryMutAct_9fa48("142") ? "" : (stryCov_9fa48("142"), "ST-1"), m1, stryMutAct_9fa48("143") ? "" : (stryCov_9fa48("143"), "monotonicNow() returned negative value")));
      }
    }

    // ST-2: Wall-clock plausibility
    const wall = wallClockNowRaw();
    if (stryMutAct_9fa48("147") ? wall > 1577836800000 : stryMutAct_9fa48("146") ? wall < 1577836800000 : stryMutAct_9fa48("145") ? false : stryMutAct_9fa48("144") ? true : (stryCov_9fa48("144", "145", "146", "147"), wall <= 1577836800000)) {
      if (stryMutAct_9fa48("148")) {
        {}
      } else {
        stryCov_9fa48("148");
        return err(createClockStartupError(stryMutAct_9fa48("149") ? "" : (stryCov_9fa48("149"), "ST-2"), wall, stryMutAct_9fa48("150") ? "" : (stryCov_9fa48("150"), "wallClockNow() returned implausible epoch value (before 2020-01-01)")));
      }
    }

    // ST-3: Monotonic non-regression
    const m2 = monotonicNowRaw();
    if (stryMutAct_9fa48("154") ? m2 >= m1 : stryMutAct_9fa48("153") ? m2 <= m1 : stryMutAct_9fa48("152") ? false : stryMutAct_9fa48("151") ? true : (stryCov_9fa48("151", "152", "153", "154"), m2 < m1)) {
      if (stryMutAct_9fa48("155")) {
        {}
      } else {
        stryCov_9fa48("155");
        return err(createClockStartupError(stryMutAct_9fa48("156") ? "" : (stryCov_9fa48("156"), "ST-3"), m2, stryMutAct_9fa48("157") ? `` : (stryCov_9fa48("157"), `monotonicNow() regressed from ${m1} to ${m2}`)));
      }
    }

    // ST-4: Bridge freeze verification (GxP mode) — checks bridge object, not Date/performance
    if (stryMutAct_9fa48("160") ? options.gxp !== true : stryMutAct_9fa48("159") ? false : stryMutAct_9fa48("158") ? true : (stryCov_9fa48("158", "159", "160"), options.gxp === (stryMutAct_9fa48("161") ? false : (stryCov_9fa48("161"), true)))) {
      if (stryMutAct_9fa48("162")) {
        {}
      } else {
        stryCov_9fa48("162");
        if (stryMutAct_9fa48("165") ? false : stryMutAct_9fa48("164") ? true : stryMutAct_9fa48("163") ? Object.isFrozen(bridge) : (stryCov_9fa48("163", "164", "165"), !Object.isFrozen(bridge))) {
          if (stryMutAct_9fa48("166")) {
            {}
          } else {
            stryCov_9fa48("166");
            return err(createClockStartupError(stryMutAct_9fa48("167") ? "" : (stryCov_9fa48("167"), "ST-4"), 0, stryMutAct_9fa48("168") ? "" : (stryCov_9fa48("168"), "bridge object is not frozen. GxP deployments MUST freeze the bridge before passing to createHostBridgeClock.")));
          }
        }
      }
    }

    // ST-5: highRes/wallClock consistency (only when highResNowMs is provided)
    if (stryMutAct_9fa48("170") ? false : stryMutAct_9fa48("169") ? true : (stryCov_9fa48("169", "170"), hasHighRes)) {
      if (stryMutAct_9fa48("171")) {
        {}
      } else {
        stryCov_9fa48("171");
        const stHighRes = highResNowRaw();
        const stWall = wallClockNowRaw();
        const divergence = Math.abs(stryMutAct_9fa48("172") ? stHighRes + stWall : (stryCov_9fa48("172"), stHighRes - stWall));
        if (stryMutAct_9fa48("176") ? divergence <= 1000 : stryMutAct_9fa48("175") ? divergence >= 1000 : stryMutAct_9fa48("174") ? false : stryMutAct_9fa48("173") ? true : (stryCov_9fa48("173", "174", "175", "176"), divergence > 1000)) {
          if (stryMutAct_9fa48("177")) {
            {}
          } else {
            stryCov_9fa48("177");
            return err(createClockStartupError(stryMutAct_9fa48("178") ? "" : (stryCov_9fa48("178"), "ST-5"), divergence, stryMutAct_9fa48("179") ? `` : (stryCov_9fa48("179"), `highResNow() and wallClockNow() diverge by ${divergence}ms (threshold: 1000ms).`)));
          }
        }
      }
    }
    const capabilities: ClockCapabilities = Object.freeze(stryMutAct_9fa48("180") ? {} : (stryCov_9fa48("180"), {
      hasMonotonicTime: stryMutAct_9fa48("181") ? false : (stryCov_9fa48("181"), true),
      hasHighResOrigin: hasHighRes,
      crossOriginIsolated: undefined,
      estimatedResolutionMs: hasHighRes ? 0.001 : 1.0,
      platform: options.platform,
      highResDegraded: stryMutAct_9fa48("182") ? hasHighRes : (stryCov_9fa48("182"), !hasHighRes),
      monotonicDegraded: stryMutAct_9fa48("183") ? true : (stryCov_9fa48("183"), false)
    }));
    const diagnostics: ClockDiagnostics = Object.freeze(stryMutAct_9fa48("184") ? {} : (stryCov_9fa48("184"), {
      adapterName: options.adapterName,
      monotonicSource: stryMutAct_9fa48("185") ? "" : (stryCov_9fa48("185"), "host-bridge"),
      highResSource: hasHighRes ? stryMutAct_9fa48("186") ? "" : (stryCov_9fa48("186"), "host-bridge") : stryMutAct_9fa48("187") ? "" : (stryCov_9fa48("187"), "host-bridge-wallclock"),
      platformResolutionMs: capabilities.estimatedResolutionMs,
      cryptoFipsMode: undefined
    }));
    const adapter = Object.freeze(stryMutAct_9fa48("188") ? {} : (stryCov_9fa48("188"), {
      monotonicNow: stryMutAct_9fa48("189") ? () => undefined : (stryCov_9fa48("189"), () => asMonotonic(monotonicNowRaw())),
      wallClockNow: stryMutAct_9fa48("190") ? () => undefined : (stryCov_9fa48("190"), () => asWallClock(wallClockNowRaw())),
      highResNow: stryMutAct_9fa48("191") ? () => undefined : (stryCov_9fa48("191"), () => asHighRes(highResNowRaw())),
      getDiagnostics: stryMutAct_9fa48("192") ? () => undefined : (stryCov_9fa48("192"), () => diagnostics),
      getCapabilities: stryMutAct_9fa48("193") ? () => undefined : (stryCov_9fa48("193"), () => capabilities)
    }));
    return ok(adapter);
  }
}

/** Factory returning a configured host bridge clock adapter. */
export function createHostBridgeClockAdapter(bridge: HostClockBridge, options: HostBridgeClockOptions) {
  if (stryMutAct_9fa48("194")) {
    {}
  } else {
    stryCov_9fa48("194");
    return createAdapter(stryMutAct_9fa48("195") ? {} : (stryCov_9fa48("195"), {
      provides: ClockPort,
      requires: stryMutAct_9fa48("196") ? ["Stryker was here"] : (stryCov_9fa48("196"), []),
      lifetime: stryMutAct_9fa48("197") ? "" : (stryCov_9fa48("197"), "singleton"),
      factory: () => {
        if (stryMutAct_9fa48("198")) {
          {}
        } else {
          stryCov_9fa48("198");
          const result = createHostBridgeClock(bridge, options);
          if (stryMutAct_9fa48("200") ? false : stryMutAct_9fa48("199") ? true : (stryCov_9fa48("199", "200"), result.isErr())) {
            if (stryMutAct_9fa48("201")) {
              {}
            } else {
              stryCov_9fa48("201");
              throw new Error(stryMutAct_9fa48("202") ? `` : (stryCov_9fa48("202"), `HostBridgeClockAdapter startup failed (${result.error.check}): ${result.error.message}`));
            }
          }
          return result.value;
        }
      }
    }));
  }
}