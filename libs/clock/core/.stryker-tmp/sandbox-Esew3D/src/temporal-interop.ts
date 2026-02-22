/**
 * Temporal API interoperability — converts between branded timestamps and Temporal.Instant.
 *
 * Detection is lazy (at call time) — importing this module does NOT require Temporal to be
 * available. Environments without Temporal can still import @hex-di/clock.
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
import { asWallClock } from "./branded.js";
import type { WallClockTimestamp, HighResTimestamp } from "./branded.js";

/** Minimal Temporal.Instant interface for type-checking without a hard dependency. */
interface TemporalInstantLike {
  readonly epochMilliseconds: bigint;
}

/** Minimal Temporal namespace for lazy detection. */
interface TemporalNamespace {
  readonly Instant: {
    fromEpochNanoseconds(epochNanoseconds: bigint): TemporalInstantLike;
  };
}

/** Lazily detects the Temporal global. Returns undefined if unavailable. */
function getTemporalGlobal(): TemporalNamespace | undefined {
  if (stryMutAct_9fa48("1024")) {
    {}
  } else {
    stryCov_9fa48("1024");
    const g = globalThis as Record<string, unknown>;
    const temporal = g[stryMutAct_9fa48("1025") ? "" : (stryCov_9fa48("1025"), "Temporal")];
    if (stryMutAct_9fa48("1028") ? temporal !== undefined && typeof temporal === "object" && temporal !== null || typeof (temporal as Record<string, unknown>)["Instant"] === "object" : stryMutAct_9fa48("1027") ? false : stryMutAct_9fa48("1026") ? true : (stryCov_9fa48("1026", "1027", "1028"), (stryMutAct_9fa48("1030") ? temporal !== undefined && typeof temporal === "object" || temporal !== null : stryMutAct_9fa48("1029") ? true : (stryCov_9fa48("1029", "1030"), (stryMutAct_9fa48("1032") ? temporal !== undefined || typeof temporal === "object" : stryMutAct_9fa48("1031") ? true : (stryCov_9fa48("1031", "1032"), (stryMutAct_9fa48("1034") ? temporal === undefined : stryMutAct_9fa48("1033") ? true : (stryCov_9fa48("1033", "1034"), temporal !== undefined)) && (stryMutAct_9fa48("1036") ? typeof temporal !== "object" : stryMutAct_9fa48("1035") ? true : (stryCov_9fa48("1035", "1036"), typeof temporal === (stryMutAct_9fa48("1037") ? "" : (stryCov_9fa48("1037"), "object")))))) && (stryMutAct_9fa48("1039") ? temporal === null : stryMutAct_9fa48("1038") ? true : (stryCov_9fa48("1038", "1039"), temporal !== null)))) && (stryMutAct_9fa48("1041") ? typeof (temporal as Record<string, unknown>)["Instant"] !== "object" : stryMutAct_9fa48("1040") ? true : (stryCov_9fa48("1040", "1041"), typeof (temporal as Record<string, unknown>)[stryMutAct_9fa48("1042") ? "" : (stryCov_9fa48("1042"), "Instant")] === (stryMutAct_9fa48("1043") ? "" : (stryCov_9fa48("1043"), "object")))))) {
      if (stryMutAct_9fa48("1044")) {
        {}
      } else {
        stryCov_9fa48("1044");
        return temporal as TemporalNamespace;
      }
    }
    return undefined;
  }
}

/**
 * Converts a WallClockTimestamp or HighResTimestamp to a Temporal.Instant.
 *
 * Throws TypeError if Temporal is not available in the current environment.
 * Monotonic timestamps are excluded — they have no absolute epoch.
 */
export function toTemporalInstant(timestamp: WallClockTimestamp | HighResTimestamp): TemporalInstantLike {
  if (stryMutAct_9fa48("1045")) {
    {}
  } else {
    stryCov_9fa48("1045");
    const Temporal = getTemporalGlobal();
    if (stryMutAct_9fa48("1048") ? Temporal !== undefined : stryMutAct_9fa48("1047") ? false : stryMutAct_9fa48("1046") ? true : (stryCov_9fa48("1046", "1047", "1048"), Temporal === undefined)) {
      if (stryMutAct_9fa48("1049")) {
        {}
      } else {
        stryCov_9fa48("1049");
        throw new TypeError(stryMutAct_9fa48("1050") ? "" : (stryCov_9fa48("1050"), "Temporal API is not available. Install a polyfill or use a runtime with native Temporal support."));
      }
    }
    const epochNanoseconds = stryMutAct_9fa48("1051") ? BigInt(Math.round(timestamp)) / 1_000_000n : (stryCov_9fa48("1051"), BigInt(Math.round(timestamp)) * 1_000_000n);
    return Temporal.Instant.fromEpochNanoseconds(epochNanoseconds);
  }
}

/**
 * Converts a Temporal.Instant to a WallClockTimestamp (epoch milliseconds, branded).
 *
 * Throws TypeError if Temporal is not available.
 */
export function fromTemporalInstant(instant: TemporalInstantLike): WallClockTimestamp {
  if (stryMutAct_9fa48("1052")) {
    {}
  } else {
    stryCov_9fa48("1052");
    const Temporal = getTemporalGlobal();
    if (stryMutAct_9fa48("1055") ? Temporal !== undefined : stryMutAct_9fa48("1054") ? false : stryMutAct_9fa48("1053") ? true : (stryCov_9fa48("1053", "1054", "1055"), Temporal === undefined)) {
      if (stryMutAct_9fa48("1056")) {
        {}
      } else {
        stryCov_9fa48("1056");
        throw new TypeError(stryMutAct_9fa48("1057") ? "" : (stryCov_9fa48("1057"), "Temporal API is not available. Install a polyfill or use a runtime with native Temporal support."));
      }
    }
    return asWallClock(Number(instant.epochMilliseconds));
  }
}