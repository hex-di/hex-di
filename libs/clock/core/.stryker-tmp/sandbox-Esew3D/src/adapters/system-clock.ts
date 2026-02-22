/**
 * SystemClockAdapter — production clock adapter using platform-native timing APIs.
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
import { ClockDiagnosticsPort } from "../ports/diagnostics.js";
import type { ClockDiagnosticsService, ClockDiagnostics, ClockCapabilities } from "../ports/diagnostics.js";
import { SequenceGeneratorPort, createSequenceOverflowError } from "../ports/sequence.js";
import type { SequenceGeneratorService } from "../ports/sequence.js";

// =============================================================================
// ClockStartupError
// =============================================================================

/** Error returned when a startup self-test fails. */
export interface ClockStartupError {
  readonly _tag: "ClockStartupError";
  readonly check: "ST-1" | "ST-2" | "ST-3" | "ST-4" | "ST-5";
  readonly message: string;
  readonly observedValue: number;
}

/** Factory for ClockStartupError — frozen per GxP error immutability. */
export function createClockStartupError(check: ClockStartupError["check"], observedValue: number, message: string): ClockStartupError {
  if (stryMutAct_9fa48("203")) {
    {}
  } else {
    stryCov_9fa48("203");
    return Object.freeze(stryMutAct_9fa48("204") ? {} : (stryCov_9fa48("204"), {
      _tag: "ClockStartupError" as const,
      check,
      observedValue,
      message
    }));
  }
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
  if (stryMutAct_9fa48("205")) {
    {}
  } else {
    stryCov_9fa48("205");
    if (stryMutAct_9fa48("208") ? typeof globalThis.performance !== "undefined" || typeof globalThis.performance.now === "function" : stryMutAct_9fa48("207") ? false : stryMutAct_9fa48("206") ? true : (stryCov_9fa48("206", "207", "208"), (stryMutAct_9fa48("210") ? typeof globalThis.performance === "undefined" : stryMutAct_9fa48("209") ? true : (stryCov_9fa48("209", "210"), typeof globalThis.performance !== (stryMutAct_9fa48("211") ? "" : (stryCov_9fa48("211"), "undefined")))) && (stryMutAct_9fa48("213") ? typeof globalThis.performance.now !== "function" : stryMutAct_9fa48("212") ? true : (stryCov_9fa48("212", "213"), typeof globalThis.performance.now === (stryMutAct_9fa48("214") ? "" : (stryCov_9fa48("214"), "function")))))) {
      if (stryMutAct_9fa48("215")) {
        {}
      } else {
        stryCov_9fa48("215");
        return globalThis.performance as PerformanceLike;
      }
    }
    return undefined;
  }
}

// =============================================================================
// Clamped Fallback
// =============================================================================

/**
 * Creates a clamped monotonic fallback using a captured Date.now reference.
 * Ensures monotonicity even when Date.now() jumps backward (NTP correction).
 */
export function createClampedFallback(capturedDateNow: () => number): () => number {
  if (stryMutAct_9fa48("216")) {
    {}
  } else {
    stryCov_9fa48("216");
    let lastValue = 0;
    return (): number => {
      if (stryMutAct_9fa48("217")) {
        {}
      } else {
        stryCov_9fa48("217");
        const now = capturedDateNow();
        if (stryMutAct_9fa48("221") ? now <= lastValue : stryMutAct_9fa48("220") ? now >= lastValue : stryMutAct_9fa48("219") ? false : stryMutAct_9fa48("218") ? true : (stryCov_9fa48("218", "219", "220", "221"), now > lastValue)) {
          if (stryMutAct_9fa48("222")) {
            {}
          } else {
            stryCov_9fa48("222");
            lastValue = now;
          }
        }
        return lastValue;
      }
    };
  }
}

// =============================================================================
// Platform Detection
// =============================================================================

type Platform = "node" | "deno" | "bun" | "browser" | "edge-worker" | "react-native" | "wasm" | "unknown";
function detectPlatform(): Platform {
  if (stryMutAct_9fa48("223")) {
    {}
  } else {
    stryCov_9fa48("223");
    const g = globalThis as Record<string, unknown>;
    if (stryMutAct_9fa48("226") ? typeof g["process"] !== "undefined" && typeof (g["process"] as Record<string, unknown>)["versions"] === "object" && (g["process"] as Record<string, unknown>)["versions"] !== null || typeof ((g["process"] as Record<string, unknown>)["versions"] as Record<string, unknown>)["node"] === "string" : stryMutAct_9fa48("225") ? false : stryMutAct_9fa48("224") ? true : (stryCov_9fa48("224", "225", "226"), (stryMutAct_9fa48("228") ? typeof g["process"] !== "undefined" && typeof (g["process"] as Record<string, unknown>)["versions"] === "object" || (g["process"] as Record<string, unknown>)["versions"] !== null : stryMutAct_9fa48("227") ? true : (stryCov_9fa48("227", "228"), (stryMutAct_9fa48("230") ? typeof g["process"] !== "undefined" || typeof (g["process"] as Record<string, unknown>)["versions"] === "object" : stryMutAct_9fa48("229") ? true : (stryCov_9fa48("229", "230"), (stryMutAct_9fa48("232") ? typeof g["process"] === "undefined" : stryMutAct_9fa48("231") ? true : (stryCov_9fa48("231", "232"), typeof g[stryMutAct_9fa48("233") ? "" : (stryCov_9fa48("233"), "process")] !== (stryMutAct_9fa48("234") ? "" : (stryCov_9fa48("234"), "undefined")))) && (stryMutAct_9fa48("236") ? typeof (g["process"] as Record<string, unknown>)["versions"] !== "object" : stryMutAct_9fa48("235") ? true : (stryCov_9fa48("235", "236"), typeof (g["process"] as Record<string, unknown>)[stryMutAct_9fa48("237") ? "" : (stryCov_9fa48("237"), "versions")] === (stryMutAct_9fa48("238") ? "" : (stryCov_9fa48("238"), "object")))))) && (stryMutAct_9fa48("240") ? (g["process"] as Record<string, unknown>)["versions"] === null : stryMutAct_9fa48("239") ? true : (stryCov_9fa48("239", "240"), (g["process"] as Record<string, unknown>)[stryMutAct_9fa48("241") ? "" : (stryCov_9fa48("241"), "versions")] !== null)))) && (stryMutAct_9fa48("243") ? typeof ((g["process"] as Record<string, unknown>)["versions"] as Record<string, unknown>)["node"] !== "string" : stryMutAct_9fa48("242") ? true : (stryCov_9fa48("242", "243"), typeof ((g["process"] as Record<string, unknown>)["versions"] as Record<string, unknown>)[stryMutAct_9fa48("244") ? "" : (stryCov_9fa48("244"), "node")] === (stryMutAct_9fa48("245") ? "" : (stryCov_9fa48("245"), "string")))))) {
      if (stryMutAct_9fa48("246")) {
        {}
      } else {
        stryCov_9fa48("246");
        return stryMutAct_9fa48("247") ? "" : (stryCov_9fa48("247"), "node");
      }
    }
    if (stryMutAct_9fa48("250") ? typeof g["Deno"] === "undefined" : stryMutAct_9fa48("249") ? false : stryMutAct_9fa48("248") ? true : (stryCov_9fa48("248", "249", "250"), typeof g[stryMutAct_9fa48("251") ? "" : (stryCov_9fa48("251"), "Deno")] !== (stryMutAct_9fa48("252") ? "" : (stryCov_9fa48("252"), "undefined")))) {
      if (stryMutAct_9fa48("253")) {
        {}
      } else {
        stryCov_9fa48("253");
        return stryMutAct_9fa48("254") ? "" : (stryCov_9fa48("254"), "deno");
      }
    }
    if (stryMutAct_9fa48("257") ? typeof g["Bun"] === "undefined" : stryMutAct_9fa48("256") ? false : stryMutAct_9fa48("255") ? true : (stryCov_9fa48("255", "256", "257"), typeof g[stryMutAct_9fa48("258") ? "" : (stryCov_9fa48("258"), "Bun")] !== (stryMutAct_9fa48("259") ? "" : (stryCov_9fa48("259"), "undefined")))) {
      if (stryMutAct_9fa48("260")) {
        {}
      } else {
        stryCov_9fa48("260");
        return stryMutAct_9fa48("261") ? "" : (stryCov_9fa48("261"), "bun");
      }
    }
    return stryMutAct_9fa48("262") ? "" : (stryCov_9fa48("262"), "unknown");
  }
}
function detectEstimatedResolution(platform: Platform, crossOriginIsolated: boolean | undefined): number {
  if (stryMutAct_9fa48("263")) {
    {}
  } else {
    stryCov_9fa48("263");
    if (stryMutAct_9fa48("266") ? (platform === "node" || platform === "deno") && platform === "bun" : stryMutAct_9fa48("265") ? false : stryMutAct_9fa48("264") ? true : (stryCov_9fa48("264", "265", "266"), (stryMutAct_9fa48("268") ? platform === "node" && platform === "deno" : stryMutAct_9fa48("267") ? false : (stryCov_9fa48("267", "268"), (stryMutAct_9fa48("270") ? platform !== "node" : stryMutAct_9fa48("269") ? false : (stryCov_9fa48("269", "270"), platform === (stryMutAct_9fa48("271") ? "" : (stryCov_9fa48("271"), "node")))) || (stryMutAct_9fa48("273") ? platform !== "deno" : stryMutAct_9fa48("272") ? false : (stryCov_9fa48("272", "273"), platform === (stryMutAct_9fa48("274") ? "" : (stryCov_9fa48("274"), "deno")))))) || (stryMutAct_9fa48("276") ? platform !== "bun" : stryMutAct_9fa48("275") ? false : (stryCov_9fa48("275", "276"), platform === (stryMutAct_9fa48("277") ? "" : (stryCov_9fa48("277"), "bun")))))) {
      if (stryMutAct_9fa48("278")) {
        {}
      } else {
        stryCov_9fa48("278");
        return 0.001; // microsecond precision
      }
    }
    if (stryMutAct_9fa48("281") ? platform !== "browser" : stryMutAct_9fa48("280") ? false : stryMutAct_9fa48("279") ? true : (stryCov_9fa48("279", "280", "281"), platform === (stryMutAct_9fa48("282") ? "" : (stryCov_9fa48("282"), "browser")))) {
      if (stryMutAct_9fa48("283")) {
        {}
      } else {
        stryCov_9fa48("283");
        if (stryMutAct_9fa48("286") ? crossOriginIsolated !== true : stryMutAct_9fa48("285") ? false : stryMutAct_9fa48("284") ? true : (stryCov_9fa48("284", "285", "286"), crossOriginIsolated === (stryMutAct_9fa48("287") ? false : (stryCov_9fa48("287"), true)))) {
          if (stryMutAct_9fa48("288")) {
            {}
          } else {
            stryCov_9fa48("288");
            return 0.005; // 5 microseconds
          }
        }
        return 1.0; // coarsened
      }
    }
    return 1.0; // conservative default
  }
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
 * Returns err(ClockStartupError) if any self-test fails.
 */
export function createSystemClock(options?: SystemClockOptions): Result<ClockService & ClockDiagnosticsService, ClockStartupError> {
  if (stryMutAct_9fa48("289")) {
    {}
  } else {
    stryCov_9fa48("289");
    // SEC-1: Capture platform API references at construction time (anti-tampering)
    const perf = getPerformance();
    const capturedDateNow = Date.now.bind(Date);
    const monotonicSource: ClockDiagnostics["monotonicSource"] = perf ? stryMutAct_9fa48("290") ? "" : (stryCov_9fa48("290"), "performance.now") : stryMutAct_9fa48("291") ? "" : (stryCov_9fa48("291"), "Date.now-clamped");
    const highResSource: ClockDiagnostics["highResSource"] = (stryMutAct_9fa48("294") ? perf !== undefined || perf.timeOrigin !== undefined : stryMutAct_9fa48("293") ? false : stryMutAct_9fa48("292") ? true : (stryCov_9fa48("292", "293", "294"), (stryMutAct_9fa48("296") ? perf === undefined : stryMutAct_9fa48("295") ? true : (stryCov_9fa48("295", "296"), perf !== undefined)) && (stryMutAct_9fa48("298") ? perf.timeOrigin === undefined : stryMutAct_9fa48("297") ? true : (stryCov_9fa48("297", "298"), perf.timeOrigin !== undefined)))) ? stryMutAct_9fa48("299") ? "" : (stryCov_9fa48("299"), "performance.timeOrigin+now") : stryMutAct_9fa48("300") ? "" : (stryCov_9fa48("300"), "Date.now");
    const clampedFallback = perf ? undefined : createClampedFallback(capturedDateNow);
    const monotonicNowRaw: () => number = perf ? stryMutAct_9fa48("301") ? () => undefined : (stryCov_9fa48("301"), () => perf.now()) : clampedFallback as () => number;
    const wallClockNowRaw: () => number = stryMutAct_9fa48("302") ? () => undefined : (stryCov_9fa48("302"), (() => {
      const wallClockNowRaw: () => number = () => capturedDateNow();
      return wallClockNowRaw;
    })());
    const highResNowRaw: () => number = (stryMutAct_9fa48("305") ? perf !== undefined || perf.timeOrigin !== undefined : stryMutAct_9fa48("304") ? false : stryMutAct_9fa48("303") ? true : (stryCov_9fa48("303", "304", "305"), (stryMutAct_9fa48("307") ? perf === undefined : stryMutAct_9fa48("306") ? true : (stryCov_9fa48("306", "307"), perf !== undefined)) && (stryMutAct_9fa48("309") ? perf.timeOrigin === undefined : stryMutAct_9fa48("308") ? true : (stryCov_9fa48("308", "309"), perf.timeOrigin !== undefined)))) ? stryMutAct_9fa48("310") ? () => undefined : (stryCov_9fa48("310"), () => stryMutAct_9fa48("311") ? (perf.timeOrigin as number) - perf.now() : (stryCov_9fa48("311"), (perf.timeOrigin as number) + perf.now())) : stryMutAct_9fa48("312") ? () => undefined : (stryCov_9fa48("312"), () => capturedDateNow());

    // ST-1: Monotonic non-negativity
    const m1 = monotonicNowRaw();
    if (stryMutAct_9fa48("316") ? m1 >= 0 : stryMutAct_9fa48("315") ? m1 <= 0 : stryMutAct_9fa48("314") ? false : stryMutAct_9fa48("313") ? true : (stryCov_9fa48("313", "314", "315", "316"), m1 < 0)) {
      if (stryMutAct_9fa48("317")) {
        {}
      } else {
        stryCov_9fa48("317");
        return err(createClockStartupError(stryMutAct_9fa48("318") ? "" : (stryCov_9fa48("318"), "ST-1"), m1, stryMutAct_9fa48("319") ? "" : (stryCov_9fa48("319"), "monotonicNow() returned negative value")));
      }
    }

    // ST-2: Wall-clock plausibility (after 2020-01-01)
    const wall = wallClockNowRaw();
    if (stryMutAct_9fa48("323") ? wall > 1577836800000 : stryMutAct_9fa48("322") ? wall < 1577836800000 : stryMutAct_9fa48("321") ? false : stryMutAct_9fa48("320") ? true : (stryCov_9fa48("320", "321", "322", "323"), wall <= 1577836800000)) {
      if (stryMutAct_9fa48("324")) {
        {}
      } else {
        stryCov_9fa48("324");
        return err(createClockStartupError(stryMutAct_9fa48("325") ? "" : (stryCov_9fa48("325"), "ST-2"), wall, stryMutAct_9fa48("326") ? "" : (stryCov_9fa48("326"), "wallClockNow() returned implausible epoch value (before 2020-01-01)")));
      }
    }

    // ST-3: Monotonic non-regression (two consecutive calls)
    const m2 = monotonicNowRaw();
    if (stryMutAct_9fa48("330") ? m2 >= m1 : stryMutAct_9fa48("329") ? m2 <= m1 : stryMutAct_9fa48("328") ? false : stryMutAct_9fa48("327") ? true : (stryCov_9fa48("327", "328", "329", "330"), m2 < m1)) {
      if (stryMutAct_9fa48("331")) {
        {}
      } else {
        stryCov_9fa48("331");
        return err(createClockStartupError(stryMutAct_9fa48("332") ? "" : (stryCov_9fa48("332"), "ST-3"), m2, stryMutAct_9fa48("333") ? `` : (stryCov_9fa48("333"), `monotonicNow() regressed from ${m1} to ${m2}`)));
      }
    }

    // ST-4: Platform API freeze verification (GxP mode only)
    if (stryMutAct_9fa48("336") ? options?.gxp !== true : stryMutAct_9fa48("335") ? false : stryMutAct_9fa48("334") ? true : (stryCov_9fa48("334", "335", "336"), (stryMutAct_9fa48("337") ? options.gxp : (stryCov_9fa48("337"), options?.gxp)) === (stryMutAct_9fa48("338") ? false : (stryCov_9fa48("338"), true)))) {
      if (stryMutAct_9fa48("339")) {
        {}
      } else {
        stryCov_9fa48("339");
        if (stryMutAct_9fa48("342") ? false : stryMutAct_9fa48("341") ? true : stryMutAct_9fa48("340") ? Object.isFrozen(Date) : (stryCov_9fa48("340", "341", "342"), !Object.isFrozen(Date))) {
          if (stryMutAct_9fa48("343")) {
            {}
          } else {
            stryCov_9fa48("343");
            return err(createClockStartupError(stryMutAct_9fa48("344") ? "" : (stryCov_9fa48("344"), "ST-4"), 0, stryMutAct_9fa48("345") ? "" : (stryCov_9fa48("345"), "Date object is not frozen. GxP deployments MUST freeze Date at application entry point.")));
          }
        }
        if (stryMutAct_9fa48("348") ? perf !== undefined || !Object.isFrozen(globalThis.performance) : stryMutAct_9fa48("347") ? false : stryMutAct_9fa48("346") ? true : (stryCov_9fa48("346", "347", "348"), (stryMutAct_9fa48("350") ? perf === undefined : stryMutAct_9fa48("349") ? true : (stryCov_9fa48("349", "350"), perf !== undefined)) && (stryMutAct_9fa48("351") ? Object.isFrozen(globalThis.performance) : (stryCov_9fa48("351"), !Object.isFrozen(globalThis.performance))))) {
          if (stryMutAct_9fa48("352")) {
            {}
          } else {
            stryCov_9fa48("352");
            return err(createClockStartupError(stryMutAct_9fa48("353") ? "" : (stryCov_9fa48("353"), "ST-4"), 0, stryMutAct_9fa48("354") ? "" : (stryCov_9fa48("354"), "performance object is not frozen. GxP deployments MUST freeze performance at application entry point.")));
          }
        }
      }
    }

    // ST-5: High-res / wall-clock consistency check (only when timeOrigin is available)
    if (stryMutAct_9fa48("357") ? perf !== undefined || perf.timeOrigin !== undefined : stryMutAct_9fa48("356") ? false : stryMutAct_9fa48("355") ? true : (stryCov_9fa48("355", "356", "357"), (stryMutAct_9fa48("359") ? perf === undefined : stryMutAct_9fa48("358") ? true : (stryCov_9fa48("358", "359"), perf !== undefined)) && (stryMutAct_9fa48("361") ? perf.timeOrigin === undefined : stryMutAct_9fa48("360") ? true : (stryCov_9fa48("360", "361"), perf.timeOrigin !== undefined)))) {
      if (stryMutAct_9fa48("362")) {
        {}
      } else {
        stryCov_9fa48("362");
        const stHighRes = highResNowRaw();
        const stWall = wallClockNowRaw();
        const divergence = Math.abs(stryMutAct_9fa48("363") ? stHighRes + stWall : (stryCov_9fa48("363"), stHighRes - stWall));
        if (stryMutAct_9fa48("367") ? divergence <= 1000 : stryMutAct_9fa48("366") ? divergence >= 1000 : stryMutAct_9fa48("365") ? false : stryMutAct_9fa48("364") ? true : (stryCov_9fa48("364", "365", "366", "367"), divergence > 1000)) {
          if (stryMutAct_9fa48("368")) {
            {}
          } else {
            stryCov_9fa48("368");
            return err(createClockStartupError(stryMutAct_9fa48("369") ? "" : (stryCov_9fa48("369"), "ST-5"), divergence, stryMutAct_9fa48("370") ? `` : (stryCov_9fa48("370"), `highResNow() and wallClockNow() diverge by ${divergence}ms (threshold: 1000ms). This indicates performance.timeOrigin was captured before NTP synchronization completed.`)));
          }
        }
      }
    }

    // Detect platform capabilities
    const platform = detectPlatform();

    // crossOriginIsolated is a browser-only Web API property — access via bracket notation
    const g = globalThis as Record<string, unknown>;
    const rawCrossOriginIsolated = g[stryMutAct_9fa48("371") ? "" : (stryCov_9fa48("371"), "crossOriginIsolated")];
    const crossOriginIsolated: boolean | undefined = (stryMutAct_9fa48("374") ? typeof rawCrossOriginIsolated !== "boolean" : stryMutAct_9fa48("373") ? false : stryMutAct_9fa48("372") ? true : (stryCov_9fa48("372", "373", "374"), typeof rawCrossOriginIsolated === (stryMutAct_9fa48("375") ? "" : (stryCov_9fa48("375"), "boolean")))) ? rawCrossOriginIsolated : undefined;
    const estimatedResolutionMs = detectEstimatedResolution(platform, crossOriginIsolated);
    const capabilities: ClockCapabilities = Object.freeze(stryMutAct_9fa48("376") ? {} : (stryCov_9fa48("376"), {
      hasMonotonicTime: stryMutAct_9fa48("379") ? perf === undefined : stryMutAct_9fa48("378") ? false : stryMutAct_9fa48("377") ? true : (stryCov_9fa48("377", "378", "379"), perf !== undefined),
      hasHighResOrigin: stryMutAct_9fa48("382") ? perf !== undefined || perf.timeOrigin !== undefined : stryMutAct_9fa48("381") ? false : stryMutAct_9fa48("380") ? true : (stryCov_9fa48("380", "381", "382"), (stryMutAct_9fa48("384") ? perf === undefined : stryMutAct_9fa48("383") ? true : (stryCov_9fa48("383", "384"), perf !== undefined)) && (stryMutAct_9fa48("386") ? perf.timeOrigin === undefined : stryMutAct_9fa48("385") ? true : (stryCov_9fa48("385", "386"), perf.timeOrigin !== undefined))),
      crossOriginIsolated,
      estimatedResolutionMs,
      platform,
      highResDegraded: stryMutAct_9fa48("389") ? perf === undefined && perf.timeOrigin === undefined : stryMutAct_9fa48("388") ? false : stryMutAct_9fa48("387") ? true : (stryCov_9fa48("387", "388", "389"), (stryMutAct_9fa48("391") ? perf !== undefined : stryMutAct_9fa48("390") ? false : (stryCov_9fa48("390", "391"), perf === undefined)) || (stryMutAct_9fa48("393") ? perf.timeOrigin !== undefined : stryMutAct_9fa48("392") ? false : (stryCov_9fa48("392", "393"), perf.timeOrigin === undefined))),
      monotonicDegraded: stryMutAct_9fa48("396") ? perf !== undefined : stryMutAct_9fa48("395") ? false : stryMutAct_9fa48("394") ? true : (stryCov_9fa48("394", "395", "396"), perf === undefined)
    }));
    const diagnostics: ClockDiagnostics = Object.freeze(stryMutAct_9fa48("397") ? {} : (stryCov_9fa48("397"), {
      adapterName: stryMutAct_9fa48("398") ? "" : (stryCov_9fa48("398"), "SystemClockAdapter"),
      monotonicSource,
      highResSource,
      platformResolutionMs: estimatedResolutionMs,
      cryptoFipsMode: undefined
    }));
    const adapter = Object.freeze(stryMutAct_9fa48("399") ? {} : (stryCov_9fa48("399"), {
      monotonicNow: stryMutAct_9fa48("400") ? () => undefined : (stryCov_9fa48("400"), () => asMonotonic(monotonicNowRaw())),
      wallClockNow: stryMutAct_9fa48("401") ? () => undefined : (stryCov_9fa48("401"), () => asWallClock(wallClockNowRaw())),
      highResNow: stryMutAct_9fa48("402") ? () => undefined : (stryCov_9fa48("402"), () => asHighRes(highResNowRaw())),
      getDiagnostics: stryMutAct_9fa48("403") ? () => undefined : (stryCov_9fa48("403"), () => diagnostics),
      getCapabilities: stryMutAct_9fa48("404") ? () => undefined : (stryCov_9fa48("404"), () => capabilities)
    }));
    return ok(adapter);
  }
}

// =============================================================================
// createSystemSequenceGenerator
// =============================================================================

/**
 * Creates a system sequence generator backed by a simple integer counter.
 * Returns a frozen object — no reset() method.
 */
export function createSystemSequenceGenerator(): SequenceGeneratorService {
  if (stryMutAct_9fa48("405")) {
    {}
  } else {
    stryCov_9fa48("405");
    let counter = 0;
    return Object.freeze(stryMutAct_9fa48("406") ? {} : (stryCov_9fa48("406"), {
      next: () => {
        if (stryMutAct_9fa48("407")) {
          {}
        } else {
          stryCov_9fa48("407");
          if (stryMutAct_9fa48("411") ? counter < Number.MAX_SAFE_INTEGER : stryMutAct_9fa48("410") ? counter > Number.MAX_SAFE_INTEGER : stryMutAct_9fa48("409") ? false : stryMutAct_9fa48("408") ? true : (stryCov_9fa48("408", "409", "410", "411"), counter >= Number.MAX_SAFE_INTEGER)) {
            if (stryMutAct_9fa48("412")) {
              {}
            } else {
              stryCov_9fa48("412");
              return err(createSequenceOverflowError(counter));
            }
          }
          stryMutAct_9fa48("413") ? counter -= 1 : (stryCov_9fa48("413"), counter += 1);
          return ok(counter);
        }
      },
      current: stryMutAct_9fa48("414") ? () => undefined : (stryCov_9fa48("414"), () => counter)
    }));
  }
}

// =============================================================================
// DI Adapters
// =============================================================================

/** Pre-wired singleton adapter that provides ClockPort via SystemClockAdapter. */
export const SystemClockAdapter = createAdapter(stryMutAct_9fa48("415") ? {} : (stryCov_9fa48("415"), {
  provides: ClockPort,
  requires: stryMutAct_9fa48("416") ? ["Stryker was here"] : (stryCov_9fa48("416"), []),
  lifetime: stryMutAct_9fa48("417") ? "" : (stryCov_9fa48("417"), "singleton"),
  factory: () => {
    if (stryMutAct_9fa48("418")) {
      {}
    } else {
      stryCov_9fa48("418");
      const result = createSystemClock();
      if (stryMutAct_9fa48("420") ? false : stryMutAct_9fa48("419") ? true : (stryCov_9fa48("419", "420"), result.isErr())) {
        if (stryMutAct_9fa48("421")) {
          {}
        } else {
          stryCov_9fa48("421");
          throw new Error(stryMutAct_9fa48("422") ? `` : (stryCov_9fa48("422"), `SystemClockAdapter startup failed (${result.error.check}): ${result.error.message}`));
        }
      }
      return result.value;
    }
  }
}));

/** Pre-wired singleton adapter that provides SequenceGeneratorPort. */
export const SystemSequenceGeneratorAdapter = createAdapter(stryMutAct_9fa48("423") ? {} : (stryCov_9fa48("423"), {
  provides: SequenceGeneratorPort,
  requires: stryMutAct_9fa48("424") ? ["Stryker was here"] : (stryCov_9fa48("424"), []),
  lifetime: stryMutAct_9fa48("425") ? "" : (stryCov_9fa48("425"), "singleton"),
  factory: stryMutAct_9fa48("426") ? () => undefined : (stryCov_9fa48("426"), () => createSystemSequenceGenerator())
}));

/** Pre-wired singleton adapter that provides ClockDiagnosticsPort (requires ClockPort). */
export const SystemClockDiagnosticsAdapter = createAdapter(stryMutAct_9fa48("427") ? {} : (stryCov_9fa48("427"), {
  provides: ClockDiagnosticsPort,
  requires: stryMutAct_9fa48("428") ? [] : (stryCov_9fa48("428"), [ClockPort]),
  lifetime: stryMutAct_9fa48("429") ? "" : (stryCov_9fa48("429"), "singleton"),
  factory: deps => {
    if (stryMutAct_9fa48("430")) {
      {}
    } else {
      stryCov_9fa48("430");
      const clock = deps.Clock as ClockService & ClockDiagnosticsService;
      return clock;
    }
  }
}));

/**
 * Factory function returning a configured SystemClockAdapter with options.
 * Use this when you need GxP mode or other options.
 */
export function createSystemClockAdapter(options?: SystemClockOptions) {
  if (stryMutAct_9fa48("431")) {
    {}
  } else {
    stryCov_9fa48("431");
    return createAdapter(stryMutAct_9fa48("432") ? {} : (stryCov_9fa48("432"), {
      provides: ClockPort,
      requires: stryMutAct_9fa48("433") ? ["Stryker was here"] : (stryCov_9fa48("433"), []),
      lifetime: stryMutAct_9fa48("434") ? "" : (stryCov_9fa48("434"), "singleton"),
      factory: () => {
        if (stryMutAct_9fa48("435")) {
          {}
        } else {
          stryCov_9fa48("435");
          const result = createSystemClock(options);
          if (stryMutAct_9fa48("437") ? false : stryMutAct_9fa48("436") ? true : (stryCov_9fa48("436", "437"), result.isErr())) {
            if (stryMutAct_9fa48("438")) {
              {}
            } else {
              stryCov_9fa48("438");
              throw new Error(stryMutAct_9fa48("439") ? `` : (stryCov_9fa48("439"), `SystemClockAdapter startup failed (${result.error.check}): ${result.error.message}`));
            }
          }
          return result.value;
        }
      }
    }));
  }
}